import { Router, Request, Response, NextFunction } from 'express';
import { searchListings, autocomplete } from './searchService';
import { AppError } from '../../utils/AppError';

export const searchRouter = Router();

// GET /api/v1/search
searchRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      category,
      subcategory,
      condition,
      minPrice,
      maxPrice,
      lat,
      lng,
      radius,
      sort,
      page,
      limit,
    } = req.query as Record<string, string | undefined>;

    const parsedCondition = condition === 'new' || condition === 'used' ? condition : undefined;
    const parsedSort =
      sort === 'newest' || sort === 'price_asc' || sort === 'price_desc' || sort === 'relevance'
        ? sort
        : undefined;

    const result = await searchListings({
      q: q || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      condition: parsedCondition,
      minPrice: minPrice !== undefined ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? parseFloat(maxPrice) : undefined,
      lat: lat !== undefined ? parseFloat(lat) : undefined,
      lng: lng !== undefined ? parseFloat(lng) : undefined,
      radius: radius !== undefined ? parseFloat(radius) : undefined,
      sort: parsedSort,
      page: page !== undefined ? Math.max(1, parseInt(page, 10)) : 1,
      limit: limit !== undefined ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20,
    });

    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/search/autocomplete?q=
searchRouter.get('/autocomplete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json({ status: 'success', data: [] });
      return;
    }
    const suggestions = await autocomplete(q);
    res.json({ status: 'success', data: suggestions });
  } catch (err) {
    next(err);
  }
});

// Error handler
searchRouter.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: err.status, message: err.message });
    return;
  }
  next(err);
});
