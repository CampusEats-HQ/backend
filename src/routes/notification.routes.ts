import { Router } from 'express';
import { getNotifications, markAllRead, markOneRead } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate('customer'));

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markOneRead);

export default router;
