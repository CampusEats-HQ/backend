import { Response, NextFunction } from 'express';
import Rider from '../models/Rider';
import Order from '../models/Order';
import Settlement from '../models/Settlement';
import { AuthRequest } from '../types';
import { ok, fail } from '../utils/response';
import { broadcastOrderTaken } from '../socket';

async function resolveRider(publicId: string) {
  const r = await Rider.findOne({ publicId });
  if (!r) throw Object.assign(new Error('Rider not found'), { statusCode: 404 });
  return r;
}

export async function getRiderStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rider = await resolveRider(req.user!.id);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [todayDeliveries, weekDeliveries] = await Promise.all([
      Order.find({ riderId: rider._id, status: 'delivered', updatedAt: { $gte: todayStart } }),
      Order.find({ riderId: rider._id, status: 'delivered', updatedAt: { $gte: weekStart } }),
    ]);

    const PAYOUT_PER_DELIVERY = 300;

    ok(res, {
      deliveriesToday: todayDeliveries.length,
      earningsToday: todayDeliveries.length * PAYOUT_PER_DELIVERY,
      rating: rider.rating,
      earningsThisWeek: weekDeliveries.length * PAYOUT_PER_DELIVERY,
    });
  } catch (err) {
    next(err);
  }
}

export async function setRiderStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { isOnline } = req.body as { isOnline: boolean };
    const rider = await resolveRider(req.user!.id);
    rider.isOnline = isOnline;
    await rider.save();
    ok(res, { isOnline: rider.isOnline });
  } catch (err) {
    next(err);
  }
}

export async function getIncomingOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await Order.findOne({ riderId: null, status: 'ready' })
      .populate<{ vendorId: { name: string; location: string } }>('vendorId', 'name location')
      .populate<{ customerId: { firstName: string; lastName: string; phone: string } }>('customerId', 'firstName lastName phone');

    if (!order) { ok(res, { order: null }); return; }

    const vendor = order.vendorId as unknown as { name: string; location: string };
    const customer = order.customerId as unknown as { firstName: string; lastName: string; phone: string };

    ok(res, {
      order: {
        id: order.publicId,
        restaurant: { name: vendor.name, location: vendor.location },
        customer: { name: `${customer.firstName} ${customer.lastName}`, phone: customer.phone, location: order.deliveryLocation },
        items: order.items.map((i) => `${i.name} x${i.quantity}`),
        distance: '~4 min walk',
        payout: 300,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function acceptOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rider = await resolveRider(req.user!.id);

    const order = await Order.findOne({ publicId: req.params.id, status: 'ready' })
      .populate<{ vendorId: { name: string; location: string } }>('vendorId', 'name location')
      .populate<{ customerId: { firstName: string; lastName: string; phone: string } }>('customerId', 'firstName lastName phone');

    if (!order || order.riderId) { fail(res, 409, 'Order already accepted by another rider or expired'); return; }

    order.riderId = rider._id;
    order.status = 'on-the-way';
    await order.save();

    broadcastOrderTaken(order.publicId);

    const vendor = order.vendorId as unknown as { name: string; location: string };
    const customer = order.customerId as unknown as { firstName: string; lastName: string; phone: string };

    ok(res, {
      delivery: {
        id: order.publicId,
        restaurant: { name: vendor.name, location: vendor.location },
        customer: { name: `${customer.firstName} ${customer.lastName}`, phone: customer.phone, location: order.deliveryLocation },
        items: order.items.map((i) => `${i.name} x${i.quantity}`),
        currentStep: 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    ok(res, { message: 'Order rejected' });
  } catch (err) {
    next(err);
  }
}

export async function advanceDeliveryStep(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { step } = req.body as { step: number };
    if (![1, 2].includes(step)) { fail(res, 400, 'No active delivery or invalid step value'); return; }
    ok(res, { currentStep: step });
  } catch (err) {
    next(err);
  }
}

export async function completeDelivery(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rider = await resolveRider(req.user!.id);
    const order = await Order.findOne({ riderId: rider._id, status: 'on-the-way' });

    if (!order) { fail(res, 400, 'No active delivery in progress'); return; }

    order.status = 'delivered';
    await order.save();

    rider.totalDeliveries += 1;
    await rider.save();

    ok(res, { message: 'Delivery completed', earnings: 300 });
  } catch (err) {
    next(err);
  }
}

export async function getRiderEarnings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rider = await resolveRider(req.user!.id);
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weekOrders = await Order.find({ riderId: rider._id, status: 'delivered', updatedAt: { $gte: weekStart } });

    const settlements = await Settlement.find({ recipientId: rider._id }).sort({ date: -1 }).limit(14);

    ok(res, {
      earningsThisWeek: weekOrders.length * 300,
      history: settlements.map((s) => ({
        date: s.date.toISOString().slice(0, 10),
        deliveries: s.ordersCount,
        amount: s.amount,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getRiderProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rider = await resolveRider(req.user!.id);
    ok(res, {
      id: rider.publicId,
      name: rider.name,
      email: rider.email,
      phone: rider.phone,
      rating: rider.rating,
      totalDeliveries: rider.totalDeliveries,
      bankName: rider.bankName,
      accountNumber: rider.accountNumber,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateRiderBank(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bankName, accountNumber } = req.body as { bankName: string; accountNumber: string };

    if (!accountNumber || accountNumber.length !== 10 || !/^\d+$/.test(accountNumber)) {
      fail(res, 400, 'Account number must be 10 digits'); return;
    }

    const rider = await resolveRider(req.user!.id);
    rider.bankName = bankName;
    rider.accountNumber = accountNumber;
    await rider.save();

    ok(res, { bankName: rider.bankName, accountNumber: rider.accountNumber });
  } catch (err) {
    next(err);
  }
}
