import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import deliveryLocationRoutes from './routes/deliveryLocation.routes';
import addressRoutes from './routes/address.routes';
import notificationRoutes from './routes/notification.routes';
import profileRoutes from './routes/profile.routes';
import vendorRoutes from './routes/vendor.routes';
import riderRoutes from './routes/rider.routes';
import adminRoutes from './routes/admin.routes';
import { handleWebhook } from './controllers/payment.controller';

import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// ─── Security & logging ───────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://staging.campus-eats.me',
    'https://app.campus-eats.me',
  ],
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Rate limiting ────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(globalLimiter);

// ─── Paystack webhook (raw body required for signature verification) ──────────

app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/delivery-locations', deliveryLocationRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/vendor', vendorRoutes);
app.use('/api/v1/rider', riderRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export default app;
