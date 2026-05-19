import mongoose, { Schema } from 'mongoose';
import { IRating } from '../types';

const RatingSchema = new Schema<IRating>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    riderId: { type: Schema.Types.ObjectId, ref: 'Rider' },
    foodRating: { type: Number, required: true, min: 1, max: 5 },
    riderRating: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<IRating>('Rating', RatingSchema);
