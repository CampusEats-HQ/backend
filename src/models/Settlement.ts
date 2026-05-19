import mongoose, { Schema } from 'mongoose';
import { ISettlement } from '../types';
import { generateSettlementId, generateSettlementRef } from '../utils/generateId';

const SettlementSchema = new Schema<ISettlement>(
  {
    publicId: { type: String, unique: true },
    recipientType: { type: String, enum: ['vendor', 'rider'], required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true },
    recipientName: { type: String, required: true },
    amount: { type: Number, required: true },
    ordersCount: { type: Number, default: 0 },
    reference: { type: String, unique: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SettlementSchema.pre('save', function () {
  if (this.isNew) {
    this.publicId = generateSettlementId();
    this.reference = generateSettlementRef();
  }
});

export default mongoose.model<ISettlement>('Settlement', SettlementSchema);
