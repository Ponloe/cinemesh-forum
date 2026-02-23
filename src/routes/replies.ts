import { Router } from 'express';
import {
  getRepliesByThread,
  createReply,
  createNestedReply,
  updateReply,
  deleteReply,
  upvoteReply,
  downvoteReply,
} from '../controllers/replyController';
import { authenticate } from '../middleware/auth';
import { replyValidation, paginationValidation } from '../middleware/validation';

const router = Router({ mergeParams: true });

// GET /api/forum/threads/:id/replies
router.get('/threads/:id/replies', paginationValidation, getRepliesByThread);

// POST /api/forum/threads/:id/replies (protected)
router.post('/threads/:id/replies', authenticate, replyValidation.create, createReply);

// IMPORTANT: Specific routes must come before generic :id routes
// POST /api/forum/replies/:id/upvote (protected) - must be before /:id/replies
router.post('/replies/:id/upvote', authenticate, upvoteReply);

// POST /api/forum/replies/:id/downvote (protected) - must be before /:id/replies
router.post('/replies/:id/downvote', authenticate, downvoteReply);

// POST /api/forum/replies/:id/replies (nested reply, protected)
router.post('/replies/:id/replies', authenticate, replyValidation.create, createNestedReply);

// PATCH /api/forum/replies/:id (protected, owner only)
router.patch('/replies/:id', authenticate, replyValidation.update, updateReply);

// DELETE /api/forum/replies/:id (protected, owner/admin)
router.delete('/replies/:id', authenticate, deleteReply);

export default router;