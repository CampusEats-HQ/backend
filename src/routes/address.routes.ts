import { Router } from 'express';
import { z } from 'zod';
import { getAddresses, addAddress, setDefaultAddress, deleteAddress } from '../controllers/address.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const addSchema = z.object({
  label: z.string().min(1),
  name: z.string().min(1),
  details: z.string().min(1),
});

router.use(authenticate('customer'));

router.get('/', getAddresses);
router.post('/', validate(addSchema), addAddress);
router.put('/:id/default', setDefaultAddress);
router.delete('/:id', deleteAddress);

export default router;
