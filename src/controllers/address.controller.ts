import { Response, NextFunction } from 'express';
import Address from '../models/Address';
import User from '../models/User';
import { AuthRequest } from '../types';
import { ok, created, fail } from '../utils/response';

async function resolveUser(publicId: string) {
  return User.findOne({ publicId });
}

export async function getAddresses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveUser(req.user!.id);
    const addresses = await Address.find({ userId: user!._id }).sort({ isDefault: -1 });

    ok(res, {
      addresses: addresses.map((a) => ({
        id: a._id.toString(),
        label: a.label,
        name: a.name,
        details: a.details,
        isDefault: a.isDefault,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function addAddress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { label, name, details } = req.body as { label: string; name: string; details: string };
    const user = await resolveUser(req.user!.id);

    const address = await Address.create({ userId: user!._id, label, name, details });

    created(res, {
      id: address._id.toString(),
      label: address.label,
      name: address.name,
      details: address.details,
      isDefault: address.isDefault,
    });
  } catch (err) {
    next(err);
  }
}

export async function setDefaultAddress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveUser(req.user!.id);
    const address = await Address.findOne({ _id: req.params.id, userId: user!._id });
    if (!address) { fail(res, 404, 'Address not found'); return; }

    await Address.updateMany({ userId: user!._id }, { isDefault: false });
    address.isDefault = true;
    await address.save();

    ok(res, { message: 'Default address updated' });
  } catch (err) {
    next(err);
  }
}

export async function deleteAddress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveUser(req.user!.id);
    const address = await Address.findOneAndDelete({ _id: req.params.id, userId: user!._id });
    if (!address) { fail(res, 404, 'Address not found'); return; }

    ok(res, { message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
}
