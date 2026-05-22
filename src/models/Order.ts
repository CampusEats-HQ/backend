import mongoose, { Schema } from 'mongoose';
import { IOrder } from '../types';

const OrderItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    restaurantId: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    publicId: { type: String, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    riderId: { type: Schema.Types.ObjectId, ref: 'Rider', index: true },
    items: { type: [OrderItemSchema], required: true },
    deliveryLocation: { type: String, required: true },
    paymentMethod: { type: String, required: true, enum: ['card', 'wallet'] },
    promoCode: { type: String },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 400 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'on-the-way', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paystackReference: { type: String },
    specialInstructions: { type: String },
    rated: { type: Boolean, default: false },
    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

OrderSchema.pre('save', function () {
  if (this.isNew && !this.publicId) {
    const seq = Math.floor(Math.random() * 9000) + 1000;
    this.publicId = `ORD-${seq}`;
  }
});

export default mongoose.model<IOrder>('Order', OrderSchema);
