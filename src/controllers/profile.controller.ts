import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from '../types';
import { ok } from '../utils/response';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ publicId: req.user!.id });
    ok(res, {
      id: user!.publicId,
      firstName: user!.firstName,
      lastName: user!.lastName,
      email: user!.email,
      phone: user!.phone ?? null,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, phone } = req.body as { firstName?: string; lastName?: string; phone?: string };
    const user = await User.findOne({ publicId: req.user!.id });

    if (firstName) user!.firstName = firstName;
    if (lastName) user!.lastName = lastName;
    if (phone) user!.phone = phone;
    await user!.save();

    ok(res, { id: user!.publicId, firstName: user!.firstName, lastName: user!.lastName, phone: user!.phone ?? null });
  } catch (err) {
    next(err);
  }
}
