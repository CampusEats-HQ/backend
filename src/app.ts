import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import orderRoutes from './routes/order.routes';
import deliveryLocationRoutes from './routes/deliveryLocation.routes';
import addressRoutes from './routes/address.routes';
import notificationRoutes from './routes/notification.routes';
import profileRoutes from './routes/profile.routes';
import vendorRoutes from './routes/vendor.routes';
import riderRoutes from './routes/rider.routes';
import adminRoutes from './routes/admin.routes';

import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// ─── Security & logging ───────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? '*', credentials: true }));
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

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/v1/auth', authLimiter, authRoutes);
app.use('/v1/restaurants', restaurantRoutes);
app.use('/v1/orders', orderRoutes);
app.use('/v1/delivery-locations', deliveryLocationRoutes);
app.use('/v1/addresses', addressRoutes);
app.use('/v1/notifications', notificationRoutes);
app.use('/v1/profile', profileRoutes);
app.use('/v1/vendor', vendorRoutes);
app.use('/v1/rider', riderRoutes);
app.use('/v1/admin', adminRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export default app;
