import { Response, NextFunction } from 'express';
import Notification from '../models/Notification';
import User from '../models/User';
import { AuthRequest } from '../types';
import { ok, fail } from '../utils/response';

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ publicId: req.user!.id });
    const notifications = await Notification.find({ userId: user!._id }).sort({ createdAt: -1 });
    const unreadCount = notifications.filter((n) => !n.read).length;

    ok(res, {
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        time: n.createdAt,
        read: n.read,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ publicId: req.user!.id });
    await Notification.updateMany({ userId: user!._id, read: false }, { read: true });
    ok(res, { message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function markOneRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ publicId: req.user!.id });
    const notif = await Notification.findOne({ _id: req.params.id, userId: user!._id });
    if (!notif) { fail(res, 404, 'Notification not found'); return; }

    notif.read = true;
    await notif.save();

    ok(res, { message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}
