import { Request, Response, NextFunction } from 'express';
import Vendor from '../models/Vendor';
import MenuItem from '../models/MenuItem';
import { ok, fail } from '../utils/response';

export async function listRestaurants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, search } = req.query as { category?: string; search?: string };

    const filter: Record<string, unknown> = { status: 'active' };
    if (category) filter.category = new RegExp(category, 'i');
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
      ];
    }

    const vendors = await Vendor.find(filter).sort({ createdAt: -1 });

    const restaurants = vendors.map((v) => ({
      id: v.publicId,
      name: v.name,
      category: v.category,
      rating: 4.5,
      deliveryTime: '12-18 min',
      deliveryFee: 400,
      image: v.image ?? null,
      isOpen: v.isOpen,
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
      isOpen: vendor.isOpen,
      menu,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPopularItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await MenuItem.find({ available: true })
      .populate<{ vendorId: { name: string; publicId: string } }>('vendorId', 'name publicId')
      .limit(20)
      .sort({ createdAt: -1 });

    const result = items.map((item) => {
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
