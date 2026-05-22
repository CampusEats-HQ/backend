import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IVendor } from '../types';
import { generatePublicId } from '../utils/generateId';

const VendorSchema = new Schema<IVendor>(
  {
    publicId: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    contact: { type: String },
    image: { type: String },
    ownerName: { type: String, required: true },
    ownerEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    bankName: { type: String },
    accountNumber: { type: String },
    isOpen: { type: Boolean, default: false },
    sponsored: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

VendorSchema.pre('save', async function () {
  if (this.isNew) {
    this.publicId = generatePublicId('V');
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

VendorSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IVendor>('Vendor', VendorSchema);
