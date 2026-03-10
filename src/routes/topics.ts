import { Router } from 'express';
import { 
  getAllTopics, 
  getTopicBySlug, 
  createTopic,
  updateTopic,  // Add
  deleteTopic   // Add
} from '../controllers/topicController';
import { authenticate, requireAdmin } from '../middleware/auth';  
import { topicValidation } from '../middleware/validation';

const router = Router();

router.get('/', getAllTopics);
router.get('/:slug', getTopicBySlug);

// Admin-only routes
router.post('/', authenticate, requireAdmin, topicValidation.create, createTopic);
router.patch('/:slug', authenticate, requireAdmin, topicValidation.update, updateTopic);  
router.delete('/:slug', authenticate, requireAdmin, deleteTopic);  

export default router;