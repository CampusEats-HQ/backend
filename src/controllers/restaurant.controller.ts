import { Request, Response, NextFunction } from 'express';
import Vendor from '../models/Vendor';
import MenuItem from '../models/MenuItem';
import Order from '../models/Order';
import Promo from '../models/Promo';
import { ok, fail } from '../utils/response';
import { isWithinOperatingHours } from './vendor.controller';

export async function listRestaurants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, search } = req.query as { category?: string; search?: string };

    const filter: Record<string, unknown> = { status: 'active', image: { $exists: true, $ne: null } };
    if (category) filter.category = new RegExp(category, 'i');
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
      ];
    }

    const vendorIdsWithMenu = await MenuItem.distinct('vendorId');
    filter._id = { $in: vendorIdsWithMenu };

    const vendors = await Vendor.find(filter).sort({ createdAt: -1 });

    const restaurants = vendors.map((v) => ({
      id: v.publicId,
      name: v.name,
      category: v.category,
      rating: 4.5,
      deliveryTime: '12-18 min',
      deliveryFee: 400,
      image: v.image ?? null,
      isOpen: v.isOpen || isWithinOperatingHours(v.openingTime, v.closingTime),
      openingTime: v.openingTime ?? null,
      closingTime: v.closingTime ?? null,
      sponsored: v.sponsored,
    }));

    ok(res, { restaurants });
  } catch (err) {
    next(err);
  }
}

export async function getRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vendor = await Vendor.findOne({ publicId: req.params.id, status: 'active' });
    if (!vendor) { fail(res, 404, 'Restaurant not found'); return; }

    const items = await MenuItem.find({ vendorId: vendor._id });

    const grouped = items.reduce<Record<string, object[]>>((acc, item) => {
      const cat = item.category.toUpperCase() + ' DISHES';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        id: item.publicId,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image ?? null,
      });
      return acc;
    }, {});

    const menu = Object.entries(grouped).map(([category, menuItems]) => ({ category, items: menuItems }));

    ok(res, {
      id: vendor.publicId,
      name: vendor.name,
      category: vendor.category,
      rating: 4.5,
      reviewsCount: 0,
      deliveryTime: '12-18 min',
      deliveryFee: 400,
      image: vendor.image ?? null,
      isOpen: vendor.isOpen || isWithinOperatingHours(vendor.openingTime, vendor.closingTime),
      openingTime: vendor.openingTime ?? null,
      closingTime: vendor.closingTime ?? null,
      menu,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPopularItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const topItems = await Order.aggregate<{ itemId: string; orderCount: number }>([
      { $match: { placedAt: { $gte: since }, status: { $nin: ['cancelled'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.itemId', orderCount: { $sum: '$items.quantity' } } },
      { $sort: { orderCount: -1 } },
      { $limit: 20 },
      { $project: { _id: 0, itemId: '$_id', orderCount: 1 } },
    ]);

    if (!topItems.length) {
      ok(res, { items: [] });
      return;
    }

    const itemIds = topItems.map((t) => t.itemId);
    const menuItems = await MenuItem.find({ publicId: { $in: itemIds }, available: true })
      .populate<{ vendorId: { name: string; publicId: string } }>('vendorId', 'name publicId');

    const countMap = new Map(topItems.map((t) => [t.itemId, t.orderCount]));

    const result = menuItems
      .sort((a, b) => (countMap.get(b.publicId) ?? 0) - (countMap.get(a.publicId) ?? 0))
      .map((item) => {
        const vendor = item.vendorId as unknown as { name: string; publicId: string };
        return {
          id: item.publicId,
          name: item.name,
          restaurant: vendor.name,
          restaurantId: vendor.publicId,
          price: item.price,
          image: item.image ?? null,
        };
      });

    ok(res, { items: result });
  } catch (err) {
    next(err);
  }
}

export async function getActivePromos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promos = await Promo.find({ active: true }).sort({ createdAt: -1 });
    ok(res, {
      promos: promos.map((p) => ({
        id: p.publicId,
        emoji: p.emoji ?? null,
        title: p.title ?? null,
        subtitle: p.subtitle ?? null,
        bg: p.bg ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
}
