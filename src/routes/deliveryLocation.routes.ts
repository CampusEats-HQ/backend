import { Router } from 'express';
import { getDeliveryLocations } from '../controllers/deliveryLocation.controller';

const router = Router();

router.get('/', getDeliveryLocations);

export default router;
