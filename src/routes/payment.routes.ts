import { Router } from 'express';
import { initializePayment, verifyPayment } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/initialize', authenticate('customer'), initializePayment);
router.get('/verify/:reference', authenticate('customer'), verifyPayment);

export default router;
