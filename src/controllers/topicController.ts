import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import xss from 'xss';
import { Topic } from '../models/Topic';
import { Thread } from '../models/Thread';
import { Reply } from '../models/Reply';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const getAllTopics = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const topics = await Topic.find().sort({ name: 1 });
    sendSuccess(res, topics, 'Topics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getTopicBySlug = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { slug } = req.params;
    const topic = await Topic.findOne({ slug });

    if (!topic) {
      sendError(res, 'Topic not found', 404);
      return;
    }

    sendSuccess(res, topic, 'Topic retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createTopic = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    logger.info('=== Create Topic Request ===');
    logger.info(`Body: ${JSON.stringify(req.body)}`);
    logger.info(`User: ${req.user?.email} (${req.user?.role})`);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error(`Validation errors: ${JSON.stringify(errors.array())}`);
      sendError(res, errors.array()[0].msg, 400);
      return;
    }

    const { name, slug, description, icon, gradient } = req.body;

    // Auto-generate slug if not provided or empty
    const finalSlug = (slug && slug.trim()) 
      ? slug.trim().toLowerCase()
      : name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
          .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens

    logger.info(`Generated slug: ${finalSlug}`);

    const topic = await Topic.create({
      name: xss(name),
      slug: finalSlug,
      description: description ? xss(description) : '',
      icon: (icon && icon.trim()) ? xss(icon) : '🎬',
      gradient: (gradient && gradient.trim()) ? xss(gradient) : '',
    });

    logger.info(`✓ Topic created: ${topic.slug}`);
    sendSuccess(res, topic, 'Topic created successfully', 201);
  } catch (error) {
    logger.error('Create topic error:', error);
    next(error);
  }
};


export const updateTopic = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, errors.array()[0].msg, 400);
      return;
    }

    const { slug } = req.params;
    const { name, description, icon, gradient } = req.body;

    const updates: Record<string, unknown> = {};
    if (name) updates.name = xss(name);
    if (description !== undefined) updates.description = xss(description);
    if (icon) updates.icon = xss(icon);
    if (gradient) updates.gradient = xss(gradient);

    const topic = await Topic.findOneAndUpdate(
      { slug },
      updates,
      { new: true, runValidators: true }
    );

    if (!topic) {
      sendError(res, 'Topic not found', 404);
      return;
    }

    sendSuccess(res, topic, 'Topic updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteTopic = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const topic = await Topic.findOne({ slug });

    if (!topic) {
      sendError(res, 'Topic not found', 404);
      return;
    }

    // Soft delete all threads in this topic
    const threadsToDelete = await Thread.find({ topic_slug: slug, is_deleted: false });
    const threadIds = threadsToDelete.map(t => t._id);
    
    // Soft delete all threads
    await Thread.updateMany(
      { topic_slug: slug },
      { $set: { is_deleted: true } }
    );
    
    // Soft delete all replies in those threads
    await Reply.updateMany(
      { thread_id: { $in: threadIds } },
      { $set: { is_deleted: true } }
    );

    // HARD delete the topic (or soft delete if you prefer)
    await Topic.findOneAndDelete({ slug });
    // OR soft delete: await Topic.findByIdAndUpdate(topic._id, { is_deleted: true });

    logger.info(`✓ Deleted topic '${slug}' with ${threadsToDelete.length} threads`);
    sendSuccess(res, null, 'Topic and all associated content deleted successfully');
  } catch (error) {
    logger.error('Delete topic error:', error);
    next(error);
  }
};