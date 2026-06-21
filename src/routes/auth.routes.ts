import { Router } from "express";
import { z } from "zod";
import {
  customerRegister,
  customerLogin,
  verifyOTP,
  forgotPassword,
  resetPassword,
  vendorLogin,
  riderRegister,
  riderLogin,
  adminLogin,
  deleteAccount,
} from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from '../middleware/auth';
import { uploadProfile, uploadDocument } from "../middleware/upload";

const router = Router();

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(4),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const otpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(4),
});

router.post("/customer/register", validate(registerSchema), customerRegister);
router.post("/customer/login", validate(loginSchema), customerLogin);
router.post("/verify-otp", validate(otpSchema), verifyOTP);
router.post("/forgot-password", validate(forgotSchema), forgotPassword);
router.post("/reset-password", validate(resetSchema), resetPassword);
router.post("/vendor/login", validate(loginSchema), vendorLogin);
router.post(
  "/rider/register",
  uploadDocument.fields([
    { name: "photo", maxCount: 1 },
    { name: "studentId", maxCount: 1 },
  ]),
  riderRegister,
);
router.post("/rider/login", validate(loginSchema), riderLogin);
router.post("/admin/login", validate(loginSchema), adminLogin);
router.delete('/account', authenticate('customer'), deleteAccount);

export default router;
