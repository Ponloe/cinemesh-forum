import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import xss from 'xss';
import { Thread } from '../models/Thread';
import { Topic } from '../models/Topic';
import { Reply } from '../models/Reply';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPaginationParams } from '../utils/response';
import { logger } from '../utils/logger';

type SortOrder = 1 | -1;

const getSortOptions = (sort?: string): Record<string, SortOrder> => {
  switch (sort) {
    case 'popular':
      return { 'stats.upvotes': -1 as SortOrder, last_activity_at: -1 as SortOrder };
    case 'most_replies':
      return { 'stats.reply_count': -1 as SortOrder, last_activity_at: -1 as SortOrder };
    case 'latest':
    default:
      return { last_activity_at: -1 as SortOrder };
  }
};

export const getThreadsByTopic = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { slug } = req.params;
    const { page, limit, sort, search } = req.query as Record<string, string>;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const topic = await Topic.findOne({ slug });
    if (!topic) {
      sendError(res, 'Topic not found', 404);
      return;
    }

    const filter: Record<string, unknown> = { topic_slug: slug, is_deleted: false };

    if (search) {
      filter.$text = { $search: search };
    }

    const sortOptions = getSortOptions(sort);

    const [threads, total] = await Promise.all([
      Thread.find(filter).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Thread.countDocuments(filter),
    ]);

    sendSuccess(res, threads, 'Threads retrieved successfully', 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getThreadById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const thread = await Thread.findOne({ slug: id, is_deleted: false });

    if (!thread) {
      sendError(res, 'Thread not found', 404);
      return;
    }

    sendSuccess(res, thread, 'Thread retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createThread = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    logger.info('=== Create Thread Request ===');
    logger.info(`Body: ${JSON.stringify(req.body)}`);
    logger.info(`User: ${req.user?.email} (${req.user?.role})`);
    logger.info(`Topic slug: ${req.params.slug}`);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error(`Validation errors: ${JSON.stringify(errors.array())}`);
      sendError(res, errors.array()[0].msg, 400);
      return;
    }

    const { slug } = req.params;
    const { title, content, movie_id, movie_title, tags } = req.body;

    const topic = await Topic.findOne({ slug });
    if (!topic) {
      logger.error(`Topic not found: ${slug}`);
      sendError(res, 'Topic not found', 404);
      return;
    }

    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    logger.info(`Creating thread in topic: ${slug}`);
    
    const thread = await Thread.create({
      topic_slug: slug,
      title: xss(title),
      content: xss(content),
      movie_id: movie_id || null,
      movie_title: movie_title ? xss(movie_title) : null,
      tags: tags ? tags.map((t: string) => xss(t)) : [],
      created_by: {
        user_id: req.user.user_id.toString(),
        username: req.user.email.split('@')[0], // Use email prefix as username fallback
        avatar_url: null,
      },
    });

    // Increment topic thread count
    await Topic.findByIdAndUpdate(topic._id, { $inc: { thread_count: 1 } });

    logger.info(`✓ Thread created: ${thread.slug}`);
    sendSuccess(res, thread, 'Thread created successfully', 201);
  } catch (error) {
    logger.error('Create thread error:', error);
    next(error);
  }
};


export const updateThread = async (
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

    const { id } = req.params;
    const thread = await Thread.findOne({ slug: id, is_deleted: false });
    
    if (!thread) {
      sendError(res, 'Thread not found', 404);
      return;
    }

    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    if (thread.created_by.user_id.toString() !== req.user.user_id.toString() && req.user.role !== 'admin') {
      sendError(res, 'You can only edit your own threads', 403);
      return;
    }

    if (thread.is_locked && req.user.role !== 'admin') {
      sendError(res, 'Thread is locked', 403);
      return;
    }

    const { title, content, tags } = req.body;
    const updates: Record<string, unknown> = {};

    if (title) updates.title = xss(title);
    if (content) updates.content = xss(content);
    if (tags) updates.tags = tags.map((t: string) => xss(t));

    const updated = await Thread.findByIdAndUpdate(thread._id, updates, { new: true, runValidators: true });

    sendSuccess(res, updated, 'Thread updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteThread = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    logger.info('=== Delete Thread Request ===');
    logger.info(`Thread slug: ${req.params.id}`);
    logger.info(`User: ${req.user?.email} (${req.user?.role}) [ID: ${req.user?.user_id}]`);
    logger.info(`Authorization header present: ${req.headers.authorization ? 'Yes' : 'No'}`);
    
    const { id } = req.params;
    const thread = await Thread.findOne({ slug: id, is_deleted: false });

    if (!thread) {
      logger.error(`Thread not found: ${id}`);
      sendError(res, 'Thread not found', 404);
      return;
    }

    logger.info(`Thread found: ${thread.title} (created by: ${thread.created_by.user_id})`);

    if (!req.user) {
      logger.error('No user in request (auth middleware should have caught this)');
      sendError(res, 'Authentication required', 401);
      return;
    }

    const threadCreatorId = thread.created_by.user_id.toString();
    const requestUserId = req.user.user_id.toString();
    const isOwner = threadCreatorId === requestUserId;
    const isAdmin = req.user.role === 'admin';

    logger.info(`Authorization check: owner=${isOwner}, admin=${isAdmin}`);
    logger.debug(`Thread creator ID: ${threadCreatorId}, Request user ID: ${requestUserId}`);

    if (!isOwner && !isAdmin) {
      logger.error(`Permission denied - User ${requestUserId} cannot delete thread owned by ${threadCreatorId}`);
      sendError(res, 'You can only delete your own threads', 403);
      return;
    }

    logger.info('✓ Authorization passed, proceeding with deletion');

    // Soft delete the thread
    await Thread.findByIdAndUpdate(thread._id, { is_deleted: true });
    logger.info(`✓ Thread marked as deleted`);

    // Cascade soft delete all replies in this thread
    const deletedReplies = await Reply.updateMany(
      { thread_id: thread._id },
      { $set: { is_deleted: true } }
    );
    logger.info(`✓ Marked ${deletedReplies.modifiedCount} replies as deleted`);

    // Decrement topic thread count
    await Topic.findOneAndUpdate(
      { slug: thread.topic_slug },
      { $inc: { thread_count: -1 } },
    );
    logger.info(`✓ Decremented thread count for topic: ${thread.topic_slug}`);

    logger.info(`✓ Successfully deleted thread '${id}' with ${deletedReplies.modifiedCount} replies`);
    sendSuccess(res, null, 'Thread and all replies deleted successfully');
  } catch (error) {
    logger.error('Delete thread error:', error);
    next(error);
  }
};

export const upvoteThread = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const thread = await Thread.findOne({ slug: id, is_deleted: false });  
    if (!thread) {
      sendError(res, 'Thread not found', 404);
      return;
    }

    const userId = req.user.user_id.toString();
    const hasUpvoted = thread.upvoted_by.includes(userId);

    let updated;
    if (hasUpvoted) {
      // Remove upvote - use thread._id instead of id (slug)
      updated = await Thread.findByIdAndUpdate(
        thread._id,
        { $pull: { upvoted_by: userId }, $inc: { 'stats.upvotes': -1 } },
        { new: true },
      );
    } else {
      // Add upvote - use thread._id instead of id (slug)
      updated = await Thread.findByIdAndUpdate(
        thread._id,
        { $addToSet: { upvoted_by: userId }, $inc: { 'stats.upvotes': 1 } },
        { new: true },
      );
    }

    sendSuccess(res, { upvotes: updated?.stats.upvotes, upvoted: !hasUpvoted }, 'Vote recorded');
  } catch (error) {
    next(error);
  }
};

export const incrementView = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Find by slug first, then update by _id
    const thread = await Thread.findOne({ slug: id, is_deleted: false });
    if (!thread) {
      sendError(res, 'Thread not found', 404);
      return;
    }

    await Thread.findByIdAndUpdate(thread._id, { $inc: { 'stats.views': 1 } });

    sendSuccess(res, null, 'View recorded');
  } catch (error) {
    next(error);
  }
};