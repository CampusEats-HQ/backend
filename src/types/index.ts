import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface AuthPayload {
  id: string;
  role: 'customer' | 'vendor' | 'rider' | 'admin';
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export type UserRole = 'customer' | 'vendor' | 'rider' | 'admin';

export interface IUser extends Document {
  _id: Types.ObjectId;
  publicId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  emailVerified: boolean;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IVendor extends Document {
  _id: Types.ObjectId;
  publicId: string;
  name: string;
  category: string;
  location: string;
  contact?: string;
  image?: string;
  ownerName: string;
  ownerEmail: string;
  bankName?: string;
  accountNumber?: string;
  isOpen: boolean;
  status: 'active' | 'inactive';
  password: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IRider extends Document {
  _id: Types.ObjectId;
  publicId: string;
  name: string;
  email: string;
  phone: string;
  matricNumber: string;
  bankName: string;
  accountNumber: string;
  photo?: string;
  rating: number;
  totalDeliveries: number;
  isOnline: boolean;
  status: 'active' | 'suspended';
  password: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IRiderApplication extends Document {
  _id: Types.ObjectId;
  publicId: string;
  fullName: string;
  email: string;
  phone: string;
  matricNumber: string;
  bankName: string;
  accountNumber: string;
  photo?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedDate: Date;
}

export interface IAdmin extends Document {
  _id: Types.ObjectId;
  publicId: string;
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'admin';
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IOrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  publicId: string;
  customerId: Types.ObjectId;
  vendorId: Types.ObjectId;
  riderId?: Types.ObjectId;
  items: IOrderItem[];
  deliveryLocation: string;
  paymentMethod: string;
  promoCode?: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'on-the-way' | 'delivered' | 'cancelled';
  specialInstructions?: string;
  rated: boolean;
  placedAt: Date;
  updatedAt: Date;
}

export interface IMenuItem extends Document {
  _id: Types.ObjectId;
  publicId: string;
  vendorId: Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  prepTime: string;
  createdAt: Date;
}

export interface IAddress extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  label: string;
  name: string;
  details: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'delivery' | 'order' | 'promo' | 'rating';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface IOTP extends Document {
  email: string;
  otp: string;
  type: 'verification' | 'reset';
  expiresAt: Date;
}

export interface IPromo extends Document {
  code: string;
  discountPercent: number;
  expiresAt: Date;
  active: boolean;
}

export interface ISettlement extends Document {
  _id: Types.ObjectId;
  publicId: string;
  recipientType: 'vendor' | 'rider';
  recipientId: Types.ObjectId;
  recipientName: string;
  amount: number;
  ordersCount: number;
  reference: string;
  date: Date;
}

export interface IRating extends Document {
  orderId: Types.ObjectId;
  customerId: Types.ObjectId;
  vendorId: Types.ObjectId;
  riderId?: Types.ObjectId;
  foodRating: number;
  riderRating?: number;
  comment?: string;
  createdAt: Date;
}
