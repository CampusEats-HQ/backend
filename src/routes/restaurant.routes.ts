import { Router } from 'express';
import { listRestaurants, getRestaurant, getPopularItems } from '../controllers/restaurant.controller';

const router = Router();

router.get('/', listRestaurants);
router.get('/popular-items', getPopularItems);
router.get('/:id', getRestaurant);

export default router;
