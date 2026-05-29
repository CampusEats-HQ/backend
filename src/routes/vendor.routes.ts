import { Router } from 'express';
import { z } from 'zod';
import {
  getDashboard,
  getVendorOrders,
  updateOrderStatus,
  getMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  toggleStore,
  getAnalytics,
  getEarnings,
  getVendorProfile,
  updateVendorProfile,
} from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadMenu, uploadProfile } from '../middleware/upload';

const router = Router();

router.use(authenticate('vendor'));

// Dashboard
router.get('/dashboard', getDashboard);

// Orders
router.get('/orders', getVendorOrders);
router.put('/orders/:id/status', validate(z.object({ status: z.enum(['pending', 'preparing', 'ready', 'completed']) })), updateOrderStatus);

// Menu
router.get('/menu', getMenu);
router.post('/menu', uploadMenu.single('photo'), addMenuItem);
router.put('/menu/:id', uploadMenu.single('photo'), updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);
router.patch('/menu/:id/availability', validate(z.object({ available: z.boolean() })), toggleItemAvailability);

// Store
router.put('/status', validate(z.object({ isOpen: z.boolean() })), toggleStore);

// Analytics & Earnings
router.get('/analytics', getAnalytics);
router.get('/earnings', getEarnings);

// Profile
router.get('/profile', getVendorProfile);
router.put('/profile', uploadProfile.single('image'), validate(z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  contact: z.string().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})), updateVendorProfile);

export default router;
