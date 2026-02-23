import { Router } from 'express';
import { getAllTopics, getTopicBySlug, createTopic } from '../controllers/topicController';
import { authenticate } from '../middleware/auth';
import { topicValidation } from '../middleware/validation';

const router = Router();

// GET /api/forum/topics
router.get('/', getAllTopics);

// GET /api/forum/topics/:slug
router.get('/:slug', getTopicBySlug);

// POST /api/forum/topics (protected, admin)
router.post('/', authenticate, topicValidation.create, createTopic);

export default router;
