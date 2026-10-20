import Joi from 'joi';
import { Review } from '../models/Review.js';

const createSchema = Joi.object({
  mealCode: Joi.string().trim().min(1).required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().trim().allow('').optional(),
  reviewedBy: Joi.string().hex().length(24).optional()
});

// GET /api/reviews
export async function getAllReviews(req, res, next) {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) { next(err); }
}

// GET /api/reviews/:id
export async function getReview(req, res, next) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ review });
  } catch (err) { next(err); }
}

// POST /api/reviews
export async function createReview(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });

    const review = await Review.create(value);
    res.status(201).json({ review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This user has already reviewed this meal' });
    }
    next(err);
  }
}

// GET /api/reviews/popular?minReviews=2
export async function getPopularMeals(req, res, next) {
  try {
    const raw = req.query.minReviews;
    let minReviews = 2;
    if (raw !== undefined) {
      if (!/^\d+$/.test(String(raw)) || Number(raw) < 1) {
        return res.status(400).json({ message: 'minReviews must be a positive integer' });
      }
      minReviews = Number(raw);
    }

    const popular = await Review.aggregate([
      { $group: { _id: '$mealCode', reviewCount: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
      { $match: { reviewCount: { $gte: minReviews } } },
      { $sort: { reviewCount: -1, _id: 1 } },
      { $project: { _id: 0, mealCode: '$_id', reviewCount: '$reviewCount', averageRating: '$averageRating' } }
    ]);

    res.json({ popular });
  } catch (err) { next(err); }
}
