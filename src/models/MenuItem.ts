import mongoose, { Schema, Types } from 'mongoose';
import { IMenuItem } from '../types';
import { generatePublicId } from '../utils/generateId';

const MenuItemSchema = new Schema<IMenuItem>(
  {
    publicId: { type: String, unique: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: ['Rice', 'Swallow', 'Drinks', 'Snacks', 'Pastries', 'Proteins'],
    },
    image: { type: String },
    available: { type: Boolean, default: true },
    prepTime: {
      type: String,
      required: true,
      enum: ['5 mins', '10 mins', '15 mins', '20 mins', '25+ mins'],
    },
  },
  { timestamps: true }
);

MenuItemSchema.pre('save', function () {
  if (this.isNew) {
    this.publicId = generatePublicId('mi');
  }
});

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
