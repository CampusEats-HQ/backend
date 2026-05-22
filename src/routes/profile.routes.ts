import { Router } from 'express';
import { z } from 'zod';
import { getProfile, updateProfile } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const updateSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

router.use(authenticate('customer'));

router.get('/', getProfile);
router.put('/', validate(updateSchema), updateProfile);

export default router;
