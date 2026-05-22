import mongoose, { Schema } from 'mongoose';
import { IPromo } from '../types';
import { generatePublicId } from '../utils/generateId';

const PromoSchema = new Schema<IPromo>(
  {
    publicId: { type: String, unique: true },
    emoji: { type: String },
    title: { type: String },
    subtitle: { type: String },
    bg: { type: String },
    code: { type: String, sparse: true, unique: true, uppercase: true, trim: true },
    discountPercent: { type: Number, min: 1, max: 100 },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PromoSchema.pre('save', function () {
  if (this.isNew && !this.publicId) {
    this.publicId = generatePublicId('promo');
  }
});

export default mongoose.model<IPromo>('Promo', PromoSchema);
