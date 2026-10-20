import { Router } from 'express';
import {
  getAllReviews,
  getReview,
  createReview,
  getPopularMeals
} from '../controllers/reviewController.js';

const router = Router();

// Declared before '/:id' so '/popular' is not swallowed by the id route.
router.get('/popular', getPopularMeals);

router.get('/', getAllReviews);
router.post('/', createReview);
router.get('/:id', getReview);

export default router;
