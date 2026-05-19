import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IAdmin } from '../types';
import { generatePublicId } from '../utils/generateId';

const AdminSchema = new Schema<IAdmin>(
  {
    publicId: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
  },
  { timestamps: true }
);

AdminSchema.pre('save', async function () {
  if (this.isNew) {
    this.publicId = generatePublicId('adm');
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

AdminSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IAdmin>('Admin', AdminSchema);
