import { Router } from 'express';
import { z } from 'zod';
import {
  placeOrder,
  getOrders,
  getOrder,
  applyPromo,
  rateOrder,
  reorder,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const placeOrderSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      name: z.string(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
      restaurantId: z.string(),
    })
  ).min(1),
  deliveryLocation: z.string().min(1),
  paymentMethod: z.enum(['card', 'wallet']),
  promoCode: z.string().optional(),
});

const promoSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
});

const rateSchema = z.object({
  foodRating: z.number().int().min(1).max(5),
  riderRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
});

router.use(authenticate('customer'));

router.post('/', validate(placeOrderSchema), placeOrder);
router.get('/', getOrders);
router.post('/apply-promo', validate(promoSchema), applyPromo);
router.get('/:orderId', getOrder);
router.post('/:orderId/rate', validate(rateSchema), rateOrder);
router.post('/:orderId/reorder', reorder);

export default router;
