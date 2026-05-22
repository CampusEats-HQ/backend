import { Router } from 'express';
import { listRestaurants, getRestaurant, getPopularItems, getActivePromos } from '../controllers/restaurant.controller';

const router = Router();

router.get('/', listRestaurants);
router.get('/popular-items', getPopularItems);
router.get('/promos', getActivePromos);
router.get('/:id', getRestaurant);

export default router;
