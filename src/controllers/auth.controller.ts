import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import User from '../models/User';
import Vendor from '../models/Vendor';
import Rider from '../models/Rider';
import RiderApplication from '../models/RiderApplication';
import Admin from '../models/Admin';
import OTP from '../models/OTP';
import { signToken } from '../utils/jwt';
import { generateOTP, otpExpiresAt } from '../utils/otp';
import { sendOTPEmail } from '../services/email.service';
import { ok, created, fail } from '../utils/response';

// ─── Customer ────────────────────────────────────────────────────────────────

export async function customerRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fullName, email, password } = req.body as {
      fullName: string;
      email: string;
      password: string;
    };

    const exists = await User.findOne({ email });
    if (exists) { fail(res, 409, 'Email already registered'); return; }

    const user = await User.create({ fullName, email, password });

    const otp = generateOTP();
    await OTP.create({ email, otp, type: 'verification', expiresAt: otpExpiresAt() });
    await sendOTPEmail(email, otp, 'verification');

    const token = signToken({ id: user.publicId, role: 'customer' });
    created(res, { token, user: { id: user.publicId, fullName: user.fullName, email: user.email } });
  } catch (err) {
    next(err);
  }
}

export async function customerLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      fail(res, 401, 'Invalid credentials');
      return;
    }

    const token = signToken({ id: user.publicId, role: 'customer' });
    ok(res, { token, user: { id: user.publicId, fullName: user.fullName, email: user.email } });
  } catch (err) {
    next(err);
  }
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

export async function verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp } = req.body as { email: string; otp: string };

    const record = await OTP.findOne({ email, type: 'verification' });

    if (!record) { fail(res, 400, 'OTP is incorrect or malformed'); return; }
    if (record.expiresAt < new Date()) { await record.deleteOne(); fail(res, 410, 'OTP has expired'); return; }
    if (record.otp !== otp) { fail(res, 400, 'OTP is incorrect or malformed'); return; }

    await User.updateOne({ email }, { emailVerified: true });
    await record.deleteOne();

    ok(res, { message: 'Email verified successfully', verified: true });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };

    const user = await User.findOne({ email });
    if (!user) { fail(res, 404, 'No account found with that email'); return; }

    await OTP.deleteMany({ email, type: 'reset' });
    const otp = generateOTP();
    await OTP.create({ email, otp, type: 'reset', expiresAt: otpExpiresAt() });
    await sendOTPEmail(email, otp, 'reset');

    ok(res, { message: 'Reset code sent to your email' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp, newPassword } = req.body as { email: string; otp: string; newPassword: string };

    const record = await OTP.findOne({ email, type: 'reset' });

    if (!record || record.otp !== otp) { fail(res, 400, 'OTP incorrect or password too weak'); return; }
    if (record.expiresAt < new Date()) { await record.deleteOne(); fail(res, 410, 'OTP expired'); return; }
    if (newPassword.length < 6) { fail(res, 400, 'OTP incorrect or password too weak'); return; }

    const user = await User.findOne({ email });
    if (!user) { fail(res, 404, 'No account found'); return; }

    user.password = newPassword;
    await user.save();
    await record.deleteOne();

    ok(res, { message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export async function vendorLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const vendor = await Vendor.findOne({ ownerEmail: email }).select('+password');
    if (!vendor || !(await vendor.comparePassword(password))) {
      fail(res, 401, 'Invalid credentials');
      return;
    }
    if (vendor.status === 'inactive') { fail(res, 403, 'Vendor account inactive'); return; }

    const token = signToken({ id: vendor.publicId, role: 'vendor' });
    ok(res, {
      token,
      vendor: {
        id: vendor.publicId,
        name: vendor.name,
        category: vendor.category,
        location: vendor.location,
        isOpen: vendor.isOpen,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Rider ────────────────────────────────────────────────────────────────────

export async function riderRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fullName, email, phone, matricNumber, bankName, accountNumber } = req.body as Record<string, string>;
    const photo = (req.file as Express.Multer.File & { path?: string })?.path;

    const existing = await RiderApplication.findOne({ email });
    if (existing) { fail(res, 409, 'Email already has a pending or active application'); return; }

    const app = await RiderApplication.create({
      fullName,
      email,
      phone,
      matricNumber,
      bankName,
      accountNumber,
      photo,
    });

    created(res, {
      message: 'Application submitted. You will be notified once approved.',
      applicationId: app.publicId,
    });
  } catch (err) {
    next(err);
  }
}

export async function riderLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const rider = await Rider.findOne({ email }).select('+password');
    if (!rider || !(await rider.comparePassword(password))) {
      fail(res, 401, 'Invalid credentials');
      return;
    }
    if (rider.status === 'suspended') { fail(res, 403, 'Application still pending or rider suspended'); return; }

    const token = signToken({ id: rider.publicId, role: 'rider' });
    ok(res, {
      token,
      rider: {
        id: rider.publicId,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        rating: rider.rating,
        totalDeliveries: rider.totalDeliveries,
        bankName: rider.bankName,
        accountNumber: rider.accountNumber,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      fail(res, 401, 'Invalid credentials');
      return;
    }

    const token = signToken({ id: admin.publicId, role: 'admin' }, '1d');
    ok(res, {
      token,
      admin: { id: admin.publicId, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    next(err);
  }
}
