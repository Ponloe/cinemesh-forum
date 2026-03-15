import { Router } from 'express';
import { body } from 'express-validator';
import {
  getThreadsByTopic,
  getMovieReviews,
  getThreadById,
  createThread,
  updateThread,
  deleteThread,
  upvoteThread,
  incrementView,
} from '../controllers/threadController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

// GET threads (works for both /topics/:slug/threads and /threads)
router.get('/', getThreadsByTopic);

// POST create thread
router.post(
  '/',
  authenticate,
  [
    body('title').trim().isLength({ min: 3, max: 200 }),
    body('content').trim().isLength({ min: 10, max: 10000 }),
    body('tags').optional().isArray({ max: 10 }),
  ],
  createThread,
);

// IMPORTANT: Specific routes must come before generic :id routes
// PATCH upvote thread - must be before /:id route
router.patch('/:id/upvote', authenticate, upvoteThread);

// PATCH increment view - must be before /:id route
router.patch('/:id/view', incrementView);

// GET movie reviews - must be before /:id route
router.get('/movies/:movieId/reviews', getMovieReviews);

// GET single thread
router.get('/:id', getThreadById);

// PATCH update thread
router.patch(
  '/:id',
  authenticate,
  [
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('content').optional().trim().isLength({ min: 10, max: 10000 }),
    body('tags').optional().isArray({ max: 10 }),
  ],
  updateThread,
);

// DELETE thread
router.delete('/:id', authenticate, deleteThread);

export default router;