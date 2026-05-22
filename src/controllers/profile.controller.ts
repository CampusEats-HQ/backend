import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from '../types';
import { ok, fail } from '../utils/response';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ publicId: req.user!.id });
    if (!user) { fail(res, 404, 'User not found'); return; }
    ok(res, {
      id: user.publicId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? null,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, phone } = req.body as { firstName?: string; lastName?: string; phone?: string };
    const user = await User.findOne({ publicId: req.user!.id });
    if (!user) { fail(res, 404, 'User not found'); return; }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    await user.save();

    ok(res, { id: user.publicId, firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? null });
  } catch (err) {
    next(err);
  }
}
