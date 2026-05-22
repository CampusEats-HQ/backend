import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Vendor from '../models/Vendor';
import MenuItem from '../models/MenuItem';
import Rider from '../models/Rider';
import User from '../models/User';
import Promo from '../models/Promo';
import Rating from '../models/Rating';
import Notification from '../models/Notification';
import { AuthRequest } from '../types';
import { ok, created, fail } from '../utils/response';
import { broadcastNewOrder } from '../socket';

const DELIVERY_FEE = 400;

// ─── Place order ─────────────────────────────────────────────────────────────

export async function placeOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, deliveryLocation, paymentMethod, promoCode } = req.body as {
      items: { itemId: string; name: string; price: number; quantity: number; restaurantId: string }[];
      deliveryLocation: string;
      paymentMethod: string;
      promoCode?: string;
    };

    if (!items?.length) { fail(res, 400, 'Empty items array or missing delivery location'); return; }
    if (!deliveryLocation) { fail(res, 400, 'Empty items array or missing delivery location'); return; }

    const restaurantId = items[0].restaurantId;
    const vendor = await Vendor.findOne({ publicId: restaurantId });
    if (!vendor) { fail(res, 404, 'Restaurant not found'); return; }

    for (const item of items) {
      const mi = await MenuItem.findOne({ publicId: item.itemId, vendorId: vendor._id });
      if (!mi || !mi.available) { fail(res, 404, 'One or more items no longer available'); return; }
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    let discount = 0;

    if (promoCode) {
      const promo = await Promo.findOne({
        code: promoCode.toUpperCase(),
        active: true,
        expiresAt: { $gt: new Date() },
      });
      if (promo) {
        discount = Math.round((subtotal * promo.discountPercent) / 100);
      }
    }

    const total = subtotal + DELIVERY_FEE - discount;

    const user = await User.findOne({ publicId: req.user!.id });

    const order = await Order.create({
      customerId: user!._id,
      vendorId: vendor._id,
      items,
      deliveryLocation,
      paymentMethod,
      promoCode,
      subtotal,
      deliveryFee: DELIVERY_FEE,
      discount,
      total,
    });

    await Notification.create({
      userId: user!._id,
      type: 'order',
      title: 'Order Placed!',
      message: `Your order from ${vendor.name} has been placed and is awaiting confirmation.`,
    });

    broadcastNewOrder({
      id: order.publicId,
      restaurant: { name: vendor.name, location: vendor.location },
      customer: { name: `${user!.firstName} ${user!.lastName}`, phone: user!.phone ?? '', location: deliveryLocation },
      items: items.map((i) => `${i.name} x${i.quantity}`),
      distance: '~4 min walk',
      payout: 300,
    });

    created(res, {
      orderId: order.publicId,
      status: order.status,
      estimatedDeliveryTime: '25-35 min',
      subtotal,
      deliveryFee: DELIVERY_FEE,
      discount,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Order history ────────────────────────────────────────────────────────────

export async function getOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ publicId: req.user!.id });
    const orders = await Order.find({ customerId: user!._id })
      .populate<{ vendorId: { name: string; publicId: string } }>('vendorId', 'name publicId')
      .populate<{ riderId: { name: string } }>('riderId', 'name')
      .sort({ placedAt: -1 });

    const result = orders.map((o) => {
      const vendor = o.vendorId as unknown as { name: string; publicId: string };
      const rider = o.riderId as unknown as { name: string } | null;
      return {
        id: o.publicId,
        date: o.placedAt.toISOString().slice(0, 10),
        time: o.placedAt.toISOString().slice(11, 16),
        restaurant: vendor.name,
        restaurantId: vendor.publicId,
        items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        total: o.total,
        status: o.status,
        rider: rider?.name ?? null,
      };
    });

    ok(res, { orders: result });
  } catch (err) {
    next(err);
  }
}

// ─── Order detail + tracking ──────────────────────────────────────────────────

export async function getOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ publicId: req.user!.id });
    if (!user) { fail(res, 404, 'User not found'); return; }
    const order = await Order.findOne({ publicId: req.params.orderId, customerId: user._id })
      .populate<{ vendorId: { name: string } }>('vendorId', 'name')
      .populate<{ riderId: { name: string; phone: string; rating: number; publicId: string } }>(
        'riderId',
        'name phone rating publicId'
      );

    if (!order) { fail(res, 404, 'Order not found or does not belong to this customer'); return; }

    const statusSteps = ['pending', 'preparing', 'on-the-way', 'delivered'];
    const currentIdx = statusSteps.indexOf(order.status);

    const steps = [
      { label: 'Order Confirmed', completed: currentIdx >= 0, active: currentIdx === 0 },
      { label: 'Being Prepared', completed: currentIdx >= 1, active: currentIdx === 1 },
      { label: 'Rider on the way', completed: currentIdx >= 2, active: currentIdx === 2 },
      { label: 'Delivered', completed: currentIdx >= 3, active: currentIdx === 3 },
    ];

    const vendor = order.vendorId as unknown as { name: string };
    const rider = order.riderId as unknown as { name: string; phone: string; rating: number } | null;

    ok(res, {
      id: order.publicId,
      status: order.status,
      restaurant: vendor.name,
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      deliveryLocation: order.deliveryLocation,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      steps,
      rider: rider ? { name: rider.name, phone: rider.phone, rating: rider.rating } : null,
      estimatedArrival: '~8 mins',
      placedAt: order.placedAt,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Apply promo ──────────────────────────────────────────────────────────────

export async function applyPromo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, subtotal } = req.body as { code: string; subtotal: number };

    const promo = await Promo.findOne({
      code: code.toUpperCase(),
      active: true,
      expiresAt: { $gt: new Date() },
    });

    if (!promo) {
      ok(res, { valid: false, message: 'Promo code not found or expired' });
      return;
    }

    const discountAmount = Math.round((subtotal * promo.discountPercent) / 100);

    ok(res, {
      valid: true,
      discountPercent: promo.discountPercent,
      discountAmount,
      newSubtotal: subtotal - discountAmount,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Rate order ───────────────────────────────────────────────────────────────

export async function rateOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { foodRating, riderRating, comment } = req.body as {
      foodRating: number;
      riderRating?: number;
      comment?: string;
    };

    if (!Number.isInteger(foodRating) || foodRating < 1 || foodRating > 5) {
      fail(res, 400, 'Ratings must be integers between 1 and 5'); return;
    }
    if (riderRating !== undefined && (!Number.isInteger(riderRating) || riderRating < 1 || riderRating > 5)) {
      fail(res, 400, 'Ratings must be integers between 1 and 5'); return;
    }

    const user = await User.findOne({ publicId: req.user!.id });
    const order = await Order.findOne({ publicId: req.params.orderId, customerId: user!._id });

    if (!order) { fail(res, 404, 'Order not found'); return; }
    if (order.rated) { fail(res, 409, 'Order already rated'); return; }

    await Rating.create({
      orderId: order._id,
      customerId: user!._id,
      vendorId: order.vendorId,
      riderId: order.riderId,
      foodRating,
      riderRating,
      comment,
    });

    order.rated = true;
    await order.save();

    if (order.riderId) {
      const allRatings = await Rating.find({ riderId: order.riderId });
      const avg = allRatings.reduce((s, r) => s + (r.riderRating ?? r.foodRating), 0) / allRatings.length;
      await Rider.findByIdAndUpdate(order.riderId, { rating: Math.round(avg * 10) / 10 });
    }

    created(res, { message: 'Rating submitted' });
  } catch (err) {
    next(err);
  }
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

export async function reorder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({ publicId: req.user!.id });
    const order = await Order.findOne({ publicId: req.params.orderId, customerId: user!._id })
      .populate<{ vendorId: { name: string; publicId: string; _id: mongoose.Types.ObjectId } }>('vendorId', 'name publicId');

    if (!order) { fail(res, 404, 'Original order not found'); return; }

    const vendor = order.vendorId as unknown as { name: string; publicId: string; _id: mongoose.Types.ObjectId };

    for (const item of order.items) {
      const mi = await MenuItem.findOne({ publicId: item.itemId, vendorId: vendor._id });
      if (!mi || !mi.available) { fail(res, 409, 'One or more items are no longer available'); return; }
    }

    created(res, {
      items: order.items.map((i) => ({
        itemId: i.itemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        restaurantId: i.restaurantId,
      })),
      restaurantId: vendor.publicId,
      restaurant: vendor.name,
    });
  } catch (err) {
    next(err);
  }
}
