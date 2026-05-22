import { Router } from 'express';
import { z } from 'zod';
import {
  getDashboard,
  getAllOrders,
  getUnassignedOrders,
  assignRider,
  getRiders,
  approveRider,
  rejectRider,
  suspendRider,
  getVendors,
  createVendor,
  setVendorStatus,
  getAdminAnalytics,
  getFinance,
  getVendorPayouts,
  getRiderPayouts,
  settlePayment,
  getSettlements,
  getPromos,
  createPromo,
  updatePromo,
  deletePromo,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Orders
router.get('/orders', getAllOrders);
router.get('/orders/unassigned', getUnassignedOrders);
router.post('/orders/:id/assign-rider', validate(z.object({ riderId: z.string() })), assignRider);

// Riders
router.get('/riders', getRiders);
router.post('/riders/:id/approve', approveRider);
router.post('/riders/:id/reject', validate(z.object({ reason: z.string().optional() })), rejectRider);
router.post('/riders/:id/suspend', validate(z.object({ reason: z.string().optional() })), suspendRider);

// Vendors
router.get('/vendors', getVendors);
router.post('/vendors', validate(z.object({
  restaurantName: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().min(10),
  location: z.string().min(2),
  bankName: z.string().min(2),
  accountNumber: z.string().min(10).max(10),
})), createVendor);
router.put('/vendors/:id/status', validate(z.object({ status: z.enum(['active', 'inactive']) })), setVendorStatus);

// Analytics
router.get('/analytics', getAdminAnalytics);

// Finance
router.get('/finance', getFinance);
router.get('/finance/payouts/vendors', getVendorPayouts);
router.get('/finance/payouts/riders', getRiderPayouts);
router.post('/finance/payouts/:id/settle', settlePayment);
router.get('/finance/settlements', getSettlements);

// Promos
const promoSchema = z.object({
  emoji: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  bg: z.string().optional(),
  active: z.boolean().optional(),
});

router.get('/promos', getPromos);
router.post('/promos', validate(promoSchema), createPromo);
router.put('/promos/:id', validate(promoSchema), updatePromo);
router.delete('/promos/:id', deletePromo);

export default router;
