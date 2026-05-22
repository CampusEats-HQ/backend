import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import Order from '../models/Order';
import Rider from '../models/Rider';
import RiderApplication from '../models/RiderApplication';
import Promo from '../models/Promo';
import Vendor from '../models/Vendor';
import User from '../models/User';
import Settlement from '../models/Settlement';
import { AuthRequest } from '../types';
import { ok, created, fail } from '../utils/response';
import { sendRiderCredentials, sendVendorCredentials } from '../services/email.service';
import { generatePublicId } from '../utils/generateId';

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [liveOrders, onlineRiders, activeVendors, todayRevenue] = await Promise.all([
      Order.find({ status: { $in: ['pending', 'preparing', 'ready', 'on-the-way'] } })
        .populate<{ vendorId: { name: string } }>('vendorId', 'name')
        .populate<{ riderId: { name: string } }>('riderId', 'name'),
      Rider.find({ isOnline: true, status: 'active' }),
      Vendor.countDocuments({ status: 'active', isOpen: true }),
      Order.aggregate([
        { $match: { placedAt: { $gte: todayStart }, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    const revenue = todayRevenue[0]?.total ?? 0;

    const liveOrdersMapped = liveOrders.map((o) => {
      const vendor = o.vendorId as unknown as { name: string };
      const rider = o.riderId as unknown as { name: string } | null;
      return {
        id: o.publicId,
        customerName: 'Customer',
        restaurant: vendor.name,
        status: o.status,
        elapsedTime: Math.floor((Date.now() - o.placedAt.getTime()) / 1000),
        needsRider: !o.riderId,
        riderName: rider?.name ?? null,
      };
    });

    const ridersMapped = onlineRiders.map((r) => ({
      id: r.publicId,
      name: r.name,
      rating: r.rating,
      deliveriesToday: 0,
      status: 'available' as const,
    }));

    ok(res, {
      stats: {
        liveOrders: liveOrders.length,
        onlineRiders: onlineRiders.length,
        activeVendors,
        revenueToday: revenue,
      },
      liveOrders: liveOrdersMapped,
      onlineRiders: ridersMapped,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getAllOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query as { status?: string };
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate<{ vendorId: { name: string } }>('vendorId', 'name')
      .populate<{ riderId: { name: string } }>('riderId', 'name')
      .sort({ placedAt: -1 });

    const result = orders.map((o) => {
      const vendor = o.vendorId as unknown as { name: string };
      const rider = o.riderId as unknown as { name: string } | null;
      return {
        id: o.publicId,
        customerName: 'Customer',
        restaurant: vendor.name,
        status: o.status,
        elapsedTime: Math.floor((Date.now() - o.placedAt.getTime()) / 1000),
        needsRider: !o.riderId,
        riderName: rider?.name ?? null,
      };
    });

    ok(res, { orders: result });
  } catch (err) {
    next(err);
  }
}

export async function getUnassignedOrders(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await Order.find({ status: 'ready', riderId: { $exists: false } })
      .populate<{ vendorId: { name: string } }>('vendorId', 'name')
      .sort({ placedAt: 1 });

    const result = orders.map((o) => {
      const vendor = o.vendorId as unknown as { name: string };
      return {
        id: o.publicId,
        customerName: 'Customer',
        restaurant: vendor.name,
        items: o.items.map((i) => `${i.name} x${i.quantity}`),
        timestamp: o.placedAt,
        total: o.total,
      };
    });

    ok(res, { orders: result });
  } catch (err) {
    next(err);
  }
}

export async function assignRider(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { riderId } = req.body as { riderId: string };

    const rider = await Rider.findOne({ publicId: riderId, status: 'active' });
    if (!rider) { fail(res, 400, 'Rider is not available'); return; }

    const order = await Order.findOne({ publicId: req.params.id });
    if (!order) { fail(res, 404, 'Order or rider not found'); return; }

    order.riderId = rider._id;
    order.status = 'on-the-way';
    await order.save();

    ok(res, { orderId: order.publicId, riderId: rider.publicId, riderName: rider.name });
  } catch (err) {
    next(err);
  }
}

// ─── Riders ───────────────────────────────────────────────────────────────────

export async function getRiders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status = 'active' } = req.query as { status?: string };

    if (status === 'pending') {
      const applications = await RiderApplication.find({ status: 'pending' });
      ok(res, {
        riders: applications.map((a) => ({
          id: a.publicId,
          name: a.fullName,
          matricNumber: a.matricNumber,
          email: a.email,
          phone: a.phone,
          bankName: a.bankName,
          accountNumber: a.accountNumber,
          photo: a.photo ?? null,
          submittedDate: a.submittedDate.toISOString().slice(0, 10),
        })),
      });
      return;
    }

    const filter: Record<string, string> = {};
    if (status === 'suspended') filter.status = 'suspended';
    else filter.status = 'active';

    const riders = await Rider.find(filter);
    ok(res, {
      riders: riders.map((r) => ({
        id: r.publicId,
        name: r.name,
        rating: r.rating,
        totalDeliveries: r.totalDeliveries,
        deliveriesToday: 0,
        status: r.isOnline ? 'delivering' : 'available',
        lastActive: 'Now',
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function approveRider(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await RiderApplication.findOne({ publicId: req.params.id });
    if (!application) { fail(res, 404, 'Application not found'); return; }
    if (application.status === 'approved') { fail(res, 409, 'Already approved'); return; }

    const tempPassword = crypto.randomBytes(6).toString('hex');

    await Rider.create({
      name: application.fullName,
      email: application.email,
      phone: application.phone,
      matricNumber: application.matricNumber,
      bankName: application.bankName,
      accountNumber: application.accountNumber,
      photo: application.photo,
      password: tempPassword,
    });

    application.status = 'approved';
    await application.save();

    await sendRiderCredentials(application.email, application.fullName, tempPassword);

    ok(res, { message: 'Rider approved and credentials sent' });
  } catch (err) {
    next(err);
  }
}

export async function rejectRider(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reason } = req.body as { reason?: string };
    const application = await RiderApplication.findOne({ publicId: req.params.id });
    if (!application) { fail(res, 404, 'Application not found'); return; }

    application.status = 'rejected';
    application.rejectionReason = reason;
    await application.save();

    ok(res, { message: 'Application rejected' });
  } catch (err) {
    next(err);
  }
}

export async function suspendRider(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const rider = await Rider.findOne({ publicId: req.params.id });
    if (!rider) { fail(res, 404, 'Rider not found'); return; }

    rider.status = 'suspended';
    await rider.save();

    ok(res, { message: 'Rider suspended' });
  } catch (err) {
    next(err);
  }
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

export async function getVendors(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendors = await Vendor.find();

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await Promise.all(
      vendors.map(async (v) => {
        const weekOrders = await Order.countDocuments({ vendorId: v._id, placedAt: { $gte: weekStart } });
        return {
          id: v.publicId,
          name: v.name,
          ownerName: v.ownerName,
          status: v.status,
          ordersThisWeek: weekOrders,
          photo: v.image ?? null,
        };
      })
    );

    ok(res, { vendors: result });
  } catch (err) {
    next(err);
  }
}

export async function createVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { restaurantName, ownerName, ownerEmail, ownerPhone, location, bankName, accountNumber } =
      req.body as Record<string, string>;

    const exists = await Vendor.findOne({ ownerEmail });
    if (exists) { fail(res, 409, 'Email already registered as a vendor'); return; }

    const tempPassword = crypto.randomBytes(6).toString('hex');

    const vendor = await Vendor.create({
      name: restaurantName,
      ownerName,
      ownerEmail,
      contact: ownerPhone,
      location,
      bankName,
      accountNumber,
      category: 'General',
      password: tempPassword,
    });

    await sendVendorCredentials(ownerEmail, ownerName, tempPassword);

    created(res, { message: 'Vendor account created and credentials sent', vendorId: vendor.publicId });
  } catch (err) {
    next(err);
  }
}

export async function setVendorStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body as { status: 'active' | 'inactive' };
    const vendor = await Vendor.findOne({ publicId: req.params.id });
    if (!vendor) { fail(res, 404, 'Vendor not found'); return; }

    vendor.status = status;
    if (status === 'inactive') vendor.isOpen = false;
    await vendor.save();

    ok(res, { id: vendor.publicId, status: vendor.status });
  } catch (err) {
    next(err);
  }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAdminAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { period = 'week' } = req.query as { period?: string };
    const days = period === 'month' ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const orders = await Order.find({ placedAt: { $gte: since } })
      .populate<{ vendorId: { name: string; publicId: string } }>('vendorId', 'name publicId');

    const vendorMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const v = o.vendorId as unknown as { name: string };
      const cur = vendorMap.get(v.name) ?? { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += o.total;
      vendorMap.set(v.name, cur);
    }

    const vendorPerformance = Array.from(vendorMap.entries()).map(([name, data]) => ({
      name,
      orders: data.orders,
      revenue: data.revenue,
    }));

    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const inProgress = orders.length - delivered - cancelled;

    ok(res, {
      revenueGrowth: [{ month: 'Current', revenue: orders.reduce((s, o) => s + o.total, 0), orders: orders.length }],
      ordersByTime: [{ time: '12pm', orders: 145 }],
      vendorPerformance,
      orderStatusDistribution: [
        { name: 'Delivered', value: delivered },
        { name: 'Cancelled', value: cancelled },
        { name: 'In Progress', value: inProgress },
      ],
      riderPerformance: [],
      customerGrowth: [],
    });
  } catch (err) {
    next(err);
  }
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export async function getFinance(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [todayRevenue, weekSettlements] = await Promise.all([
      Order.aggregate([
        { $match: { placedAt: { $gte: todayStart }, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$total', 0.1] } } } },
      ]),
      Settlement.aggregate([
        { $match: { date: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const pendingVendors = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    ok(res, {
      platformEarningsToday: todayRevenue[0]?.total ?? 0,
      pendingPayouts: pendingVendors[0]?.total ?? 0,
      settledThisWeek: weekSettlements[0]?.total ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

export async function getVendorPayouts(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendors = await Vendor.find({ status: 'active' });

    const payouts = await Promise.all(
      vendors.map(async (v) => {
        const lastSettlement = await Settlement.findOne({ recipientId: v._id, recipientType: 'vendor' }).sort({ date: -1 });
        const pendingOrders = await Order.find({
          vendorId: v._id,
          status: 'delivered',
          placedAt: lastSettlement ? { $gt: lastSettlement.date } : {},
        });
        const amountOwed = pendingOrders.reduce((s, o) => s + o.total, 0);

        return {
          id: `pv_${v._id.toString().slice(-6)}`,
          vendorName: v.name,
          ordersSinceLastSettlement: pendingOrders.length,
          amountOwed,
          lastSettlementDate: lastSettlement?.date.toISOString().slice(0, 10) ?? null,
          status: 'pending',
        };
      })
    );

    ok(res, { payouts: payouts.filter((p) => p.amountOwed > 0) });
  } catch (err) {
    next(err);
  }
}

export async function getRiderPayouts(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const riders = await Rider.find({ status: 'active' });

    const payouts = await Promise.all(
      riders.map(async (r) => {
        const lastSettlement = await Settlement.findOne({ recipientId: r._id, recipientType: 'rider' }).sort({ date: -1 });
        const pendingDeliveries = await Order.find({
          riderId: r._id,
          status: 'delivered',
          updatedAt: lastSettlement ? { $gt: lastSettlement.date } : {},
        });

        const amountOwed = pendingDeliveries.length * 300;

        return {
          id: `pr_${r._id.toString().slice(-6)}`,
          riderName: r.name,
          deliveriesSinceLastSettlement: pendingDeliveries.length,
          amountOwed,
          lastSettlementDate: lastSettlement?.date.toISOString().slice(0, 10) ?? null,
          status: 'pending',
        };
      })
    );

    ok(res, { payouts: payouts.filter((p) => p.amountOwed > 0) });
  } catch (err) {
    next(err);
  }
}

export async function settlePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await Settlement.findOne({ publicId: id });
    if (existing) { fail(res, 409, 'Already settled'); return; }

    const settlement = new Settlement({
      publicId: id,
      recipientType: 'vendor' as const,
      recipientId: new (await import('mongoose')).Types.ObjectId(),
      recipientName: 'Recipient',
      amount: 0,
      ordersCount: 0,
    });
    await settlement.save();

    ok(res, { message: 'Payout settled', reference: (settlement as typeof settlement & { reference: string }).reference });
  } catch (err) {
    next(err);
  }
}

export async function getSettlements(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { period = 'all' } = req.query as { period?: string };
    const filter: Record<string, unknown> = {};

    if (period !== 'all') {
      const now = new Date();
      if (period === 'today') {
        now.setHours(0, 0, 0, 0);
        filter.date = { $gte: now };
      } else if (period === 'week') {
        filter.date = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
      } else if (period === 'month') {
        filter.date = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
      }
    }

    const settlements = await Settlement.find(filter).sort({ date: -1 });

    ok(res, {
      settlements: settlements.map((s) => ({
        id: s.publicId,
        date: s.date.toISOString().slice(0, 10),
        recipientType: s.recipientType === 'vendor' ? 'Vendor' : 'Rider',
        recipientName: s.recipientName,
        amount: s.amount,
        reference: s.reference,
      })),
    });
  } catch (err) {
    next(err);
  }
}


// ─── Promos ───────────────────────────────────────────────────────────────────

export async function getPromos(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const promos = await Promo.find().sort({ createdAt: -1 });
    ok(res, {
      promos: promos.map((p) => ({
        id: p.publicId,
        emoji: p.emoji ?? null,
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        bg: p.bg ?? null,
        active: p.active,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createPromo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { emoji, title, subtitle, bg, active } = req.body as {
      emoji?: string; title?: string; subtitle?: string; bg?: string; active?: boolean;
    };
    const promo = await Promo.create({ emoji, title, subtitle, bg, active: active ?? true });
    created(res, { id: promo.publicId, emoji: promo.emoji, title: promo.title, subtitle: promo.subtitle, bg: promo.bg, active: promo.active });
  } catch (err) {
    next(err);
  }
}

export async function updatePromo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await Promo.findOne({ publicId: req.params.id });
    if (!promo) { fail(res, 404, 'Promo not found'); return; }

    const { emoji, title, subtitle, bg, active } = req.body as {
      emoji?: string; title?: string; subtitle?: string; bg?: string; active?: boolean;
    };

    if (emoji !== undefined) promo.emoji = emoji;
    if (title !== undefined) promo.title = title;
    if (subtitle !== undefined) promo.subtitle = subtitle;
    if (bg !== undefined) promo.bg = bg;
    if (active !== undefined) promo.active = active;
    await promo.save();

    ok(res, { id: promo.publicId, emoji: promo.emoji, title: promo.title, subtitle: promo.subtitle, bg: promo.bg, active: promo.active });
  } catch (err) {
    next(err);
  }
}

export async function deletePromo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await Promo.findOneAndDelete({ publicId: req.params.id });
    if (!promo) { fail(res, 404, 'Promo not found'); return; }
    ok(res, { message: 'Promo deleted' });
  } catch (err) {
    next(err);
  }
}
