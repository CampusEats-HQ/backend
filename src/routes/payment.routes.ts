import { Router } from 'express';
import { initializePayment } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/initialize', authenticate('customer'), initializePayment);

export default router;
