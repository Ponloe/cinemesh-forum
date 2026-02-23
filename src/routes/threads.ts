import { Router } from 'express';
import {
  getThreadsByTopic,
  getThreadById,
  createThread,
  updateThread,
  deleteThread,
  upvoteThread,
  incrementView,
} from '../controllers/threadController';
import { authenticate } from '../middleware/auth';
import { threadValidation, paginationValidation } from '../middleware/validation';

const router = Router({ mergeParams: true });

// GET /api/forum/topics/:slug/threads
router.get('/', paginationValidation, getThreadsByTopic);

// GET /api/forum/threads/:id
router.get('/:id', getThreadById);

// POST /api/forum/topics/:slug/threads (protected)
router.post('/', authenticate, threadValidation.create, createThread);

// PATCH /api/forum/threads/:id (protected, owner only)
router.patch('/:id', authenticate, threadValidation.update, updateThread);

// DELETE /api/forum/threads/:id (protected, owner/admin)
router.delete('/:id', authenticate, deleteThread);

// POST /api/forum/threads/:id/upvote (protected)
router.post('/:id/upvote', authenticate, upvoteThread);

// POST /api/forum/threads/:id/view
router.post('/:id/view', incrementView);

export default router;
