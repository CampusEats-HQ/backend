import { Response, NextFunction } from 'express';
import Vendor from '../models/Vendor';
import Order from '../models/Order';
import MenuItem from '../models/MenuItem';
import Settlement from '../models/Settlement';
import { AuthRequest } from '../types';
import { ok, created, fail } from '../utils/response';

async function resolveVendor(publicId: string) {
  const v = await Vendor.findOne({ publicId });
  if (!v) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
  return v;
}

export function isWithinOperatingHours(openingTime?: string, closingTime?: string): boolean {
  if (!openingTime || !closingTime) return true;
  const now = new Date();
  const watMinutes = (now.getUTCHours() + 1) * 60 + now.getUTCMinutes();
  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);
  return watMinutes >= openH * 60 + openM && watMinutes < closeH * 60 + closeM;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = await Order.find({
      vendorId: vendor._id,
      placedAt: { $gte: todayStart },
    });

    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const pendingOrders = todayOrders.filter((o) => o.status === 'pending').length;

    ok(res, {
      isOpen: vendor.isOpen,
      todayOrders: todayOrders.length,
      todayRevenue,
      pendingOrders,
      avgPrepTime: 15,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getVendorOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    const { status } = req.query as { status?: string };

    const filter: Record<string, unknown> = { vendorId: vendor._id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate<{ customerId: { firstName: string; lastName: string } }>('customerId', 'firstName lastName')
      .populate<{ riderId: { name: string } }>('riderId', 'name')
      .sort({ placedAt: -1 });

    const result = orders.map((o) => {
      const customer = o.customerId as unknown as { firstName: string; lastName: string };
      const rider = o.riderId as unknown as { name: string } | null;
      return {
        id: o.publicId,
        customerName: `${customer.firstName} ${customer.lastName}`,
        items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total: o.total,
        status: o.status,
        timestamp: o.placedAt,
        location: o.deliveryLocation,
        riderName: rider?.name ?? null,
        specialInstructions: o.specialInstructions ?? null,
      };
    });

    ok(res, { orders: result });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    const { status } = req.body as { status: string };

    const allowed = ['pending', 'preparing', 'ready', 'completed'];
    if (!allowed.includes(status)) { fail(res, 400, 'Invalid status transition'); return; }

    const order = await Order.findOne({ publicId: req.params.id, vendorId: vendor._id });
    if (!order) { fail(res, 404, 'Order not found'); return; }

    order.status = status as typeof order.status;
    await order.save();

    ok(res, { id: order.publicId, status: order.status });
  } catch (err) {
    next(err);
  }
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export async function getMenu(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    const items = await MenuItem.find({ vendorId: vendor._id });

    ok(res, {
      items: items.map((i) => ({
        id: i.publicId,
        name: i.name,
        description: i.description ?? null,
        price: i.price,
        category: i.category,
        image: i.image ?? null,
        available: i.available,
        prepTime: i.prepTime,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function addMenuItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    const { name, description, price, category, prepTime, available } = req.body as Record<string, string>;
    const image = (req.file as Express.Multer.File & { path?: string })?.path;

    if (!name || !price || !category || !prepTime) {
      fail(res, 400, 'Missing name, price, category, or prepTime'); return;
    }

    const item = await MenuItem.create({
      vendorId: vendor._id,
      name,
      description,
      price: Number(price),
      category,
      prepTime,
      available: available === 'true',
      image,
    });

    created(res, {
      id: item.publicId,
      name: item.name,
      description: item.description ?? null,
      price: item.price,
      category: item.category,
      image: item.image ?? null,
      available: item.available,
      prepTime: item.prepTime,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMenuItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    const item = await MenuItem.findOne({ publicId: req.params.id, vendorId: vendor._id });
    if (!item) { fail(res, 404, 'Item not found'); return; }

    const { name, description, price, category, prepTime, available } = req.body as Record<string, string>;
    const image = (req.file as Express.Multer.File & { path?: string })?.path;

    if (name) item.name = name;
    if (description !== undefined) item.description = description;
    if (price) item.price = Number(price);
    if (category) item.category = category;
    if (prepTime) item.prepTime = prepTime;
    if (available !== undefined) item.available = String(available) === 'true';
    if (image) item.image = image;

    await item.save();

    ok(res, { id: item.publicId, name: item.name, price: item.price, available: item.available });
  } catch (err) {
    next(err);
  }
}

export async function deleteMenuItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    const item = await MenuItem.findOneAndDelete({ publicId: req.params.id, vendorId: vendor._id });
    if (!item) { fail(res, 404, 'Item not found'); return; }

    ok(res, { message: 'Menu item deleted' });
  } catch (err) {
    next(err);
  }
}

export async function toggleItemAvailability(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    const { available } = req.body as { available: boolean };

    const item = await MenuItem.findOne({ publicId: req.params.id, vendorId: vendor._id });
    if (!item) { fail(res, 404, 'Item not found'); return; }

    item.available = available;
    await item.save();

    ok(res, { id: item.publicId, available: item.available });
  } catch (err) {
    next(err);
  }
}

// ─── Store status ─────────────────────────────────────────────────────────────

export async function toggleStore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { isOpen } = req.body as { isOpen: boolean };
    const vendor = await resolveVendor(req.user!.id);

    vendor.isOpen = isOpen;
    await vendor.save();

    ok(res, { isOpen: vendor.isOpen });
  } catch (err) {
    next(err);
  }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    const { period = 'week' } = req.query as { period?: string };

    const days = period === 'month' ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const orders = await Order.find({
      vendorId: vendor._id,
      placedAt: { $gte: since },
      status: { $in: ['delivered', 'on-the-way'] },
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyMap = new Map<string, { orders: number; revenue: number }>();

    for (const o of orders) {
      const day = dayNames[o.placedAt.getDay()];
      const cur = dailyMap.get(day) ?? { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += o.total;
      dailyMap.set(day, cur);
    }

    const dailySales = Array.from(dailyMap.entries()).map(([day, data]) => ({
      day,
      orders: data.orders,
      revenue: data.revenue,
    }));

    const itemCounts = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      for (const i of o.items) {
        const cur = itemCounts.get(i.name) ?? { orders: 0, revenue: 0 };
        cur.orders += i.quantity;
        cur.revenue += i.price * i.quantity;
        itemCounts.set(i.name, cur);
      }
    }

    const topItems = Array.from(itemCounts.entries())
      .sort((a, b) => b[1].orders - a[1].orders)
      .slice(0, 5)
      .map(([name, data]) => ({ name, orders: data.orders, revenue: data.revenue }));

    ok(res, {
      dailySales,
      peakHours: [{ hour: '12pm', orders: 22 }, { hour: '1pm', orders: 18 }],
      topItems,
      orderSources: [{ name: 'Direct', value: 65 }, { name: 'Reorders', value: 35 }],
    });
  } catch (err) {
    next(err);
  }
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

export async function getEarnings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [monthOrders, weekOrders] = await Promise.all([
      Order.find({ vendorId: vendor._id, placedAt: { $gte: monthStart }, status: 'delivered' }),
      Order.find({ vendorId: vendor._id, placedAt: { $gte: weekStart }, status: 'delivered' }),
    ]);

    const settlements = await Settlement.find({ recipientId: vendor._id, recipientType: 'vendor' }).sort({ date: -1 }).limit(10);
    const lastSettlement = settlements[0];

    const pendingOrders = await Order.find({
      vendorId: vendor._id,
      status: 'delivered',
      placedAt: lastSettlement ? { $gt: lastSettlement.date } : {},
    });
    const pendingSettlement = pendingOrders.reduce((s, o) => s + o.total, 0);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyMap = new Map<string, number>();
    for (const o of weekOrders) {
      const day = dayNames[o.placedAt.getDay()];
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + o.total);
    }

    ok(res, {
      thisMonth: monthOrders.reduce((s, o) => s + o.total, 0),
      thisWeek: weekOrders.reduce((s, o) => s + o.total, 0),
      pendingSettlement,
      dailyEarnings: Array.from(dailyMap.entries()).map(([day, amount]) => ({ day, amount })),
      transactions: settlements.map((s) => ({
        date: s.date.toISOString().slice(0, 10),
        orders: s.ordersCount,
        amount: s.amount,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getVendorProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    ok(res, {
      id: vendor.publicId,
      name: vendor.name,
      category: vendor.category,
      location: vendor.location,
      image: vendor.image ?? null,
      contact: vendor.contact ?? null,
      openingTime: vendor.openingTime ?? null,
      closingTime: vendor.closingTime ?? null,
      bankAccount: vendor.bankName && vendor.accountNumber ? `${vendor.bankName} — ${vendor.accountNumber}` : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateVendorProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await resolveVendor(req.user!.id);
    const { name, category, location, contact, openingTime, closingTime } = req.body as Record<string, string>;
    const image = (req.file as Express.Multer.File & { path?: string })?.path;

    if (name) vendor.name = name;
    if (category) vendor.category = category;
    if (location) vendor.location = location;
    if (contact) vendor.contact = contact;
    if (image) vendor.image = image;
    if (openingTime) vendor.openingTime = openingTime;
    if (closingTime) vendor.closingTime = closingTime;
    await vendor.save();

    ok(res, {
      name: vendor.name,
      category: vendor.category,
      location: vendor.location,
      contact: vendor.contact ?? null,
      image: vendor.image ?? null,
      openingTime: vendor.openingTime ?? null,
      closingTime: vendor.closingTime ?? null,
    });
  } catch (err) {
    next(err);
  }
}
