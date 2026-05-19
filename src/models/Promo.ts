import mongoose, { Schema } from 'mongoose';
import { IPromo } from '../types';

const PromoSchema = new Schema<IPromo>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    expiresAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPromo>('Promo', PromoSchema);
