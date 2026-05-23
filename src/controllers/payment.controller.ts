import { Request, Response, NextFunction } from 'express';
import Order from '../models/Order';
import User from '../models/User';
import Vendor from '../models/Vendor';
import { AuthRequest } from '../types';
import { ok, fail } from '../utils/response';
import { initializeTransaction, verifyTransaction, verifyWebhookSignature } from '../services/paystack.service';
import { broadcastNewOrder } from '../socket';

export async function initializePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderId } = req.body as { orderId: string };

    const user = await User.findOne({ publicId: req.user!.id });
    if (!user) { fail(res, 404, 'User not found'); return; }

    const order = await Order.findOne({ publicId: orderId, customerId: user._id });
    if (!order) { fail(res, 404, 'Order not found'); return; }
    if (order.paymentStatus === 'paid') { fail(res, 409, 'Order already paid'); return; }

    const reference = `${order.publicId}-${Date.now()}`;
    const amountKobo = order.total * 100;

    const { authorization_url } = await initializeTransaction(user.email, amountKobo, reference);

    order.paystackReference = reference;
    await order.save();

    ok(res, { authorizationUrl: authorization_url, reference });
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const reference = req.params.reference as string;

    const order = await Order.findOne({ paystackReference: reference });
    if (!order) { fail(res, 404, 'Order not found'); return; }

    if (order.paymentStatus !== 'paid') {
      const result = await verifyTransaction(reference);
      if (result.status === 'success') {
        order.paymentStatus = 'paid';
        await order.save();
      }
    }

    ok(res, { orderId: order.publicId, paymentStatus: order.paymentStatus });
  } catch (err) {
    next(err);
  }
}

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-paystack-signature'] as string;

  if (!verifyWebhookSignature(req.body as Buffer, signature)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const event = JSON.parse((req.body as Buffer).toString());

  if (event.event === 'charge.success') {
    const reference: string = event.data.reference;

    const order = await Order.findOne({ paystackReference: reference });
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      await order.save();

      const vendor = await Vendor.findById(order.vendorId);
      const user = await User.findById(order.customerId);

      if (vendor && user) {
        broadcastNewOrder({
          id: order.publicId,
          restaurant: { name: vendor.name, location: vendor.location },
          customer: { name: `${user.firstName} ${user.lastName}`, phone: user.phone ?? '', location: order.deliveryLocation },
          items: order.items.map((i) => `${i.name} x${i.quantity}`),
          distance: '~4 min walk',
          payout: 300,
        });
      }
    }
  }

  res.sendStatus(200);
}
