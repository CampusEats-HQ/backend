import { Router } from 'express';
import { z } from 'zod';
import {
  getRiderStats,
  setRiderStatus,
  getIncomingOrder,
  acceptOrder,
  rejectOrder,
  advanceDeliveryStep,
  completeDelivery,
  getRiderEarnings,
  getRiderProfile,
  updateRiderBank,
} from '../controllers/rider.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate('rider'));

router.get('/stats', getRiderStats);
router.put('/status', validate(z.object({ isOnline: z.boolean() })), setRiderStatus);
router.get('/incoming-order', getIncomingOrder);
router.post('/orders/:id/accept', acceptOrder);
router.post('/orders/:id/reject', rejectOrder);
router.put('/delivery/step', validate(z.object({ step: z.number().int().min(1).max(2) })), advanceDeliveryStep);
router.post('/delivery/complete', completeDelivery);
router.get('/earnings', getRiderEarnings);
router.get('/profile', getRiderProfile);
router.put('/bank', validate(z.object({ bankName: z.string().min(1), accountNumber: z.string().length(10) })), updateRiderBank);

export default router;
