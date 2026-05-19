import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from '../types';
import { ok } from '../utils/response';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ publicId: req.user!.id });
    ok(res, {
      id: user!.publicId,
      fullName: user!.fullName,
      email: user!.email,
      phone: user!.phone ?? null,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fullName, phone } = req.body as { fullName?: string; phone?: string };
    const user = await User.findOne({ publicId: req.user!.id });

    if (fullName) user!.fullName = fullName;
    if (phone) user!.phone = phone;
    await user!.save();

    ok(res, { id: user!.publicId, fullName: user!.fullName, phone: user!.phone ?? null });
  } catch (err) {
    next(err);
  }
}
