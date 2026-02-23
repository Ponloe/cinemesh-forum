import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import xss from 'xss';
import { Thread } from '../models/Thread';
import { Topic } from '../models/Topic';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPaginationParams } from '../utils/response';

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, errors.array()[0].msg, 400);
      return;
    }

    const { slug } = req.params;
    const { title, content, movie_id, movie_title, tags } = req.body;

    const topic = await Topic.findOne({ slug });
    if (!topic) {
      sendError(res, 'Topic not found', 404);
      return;
    }

    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

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

    sendSuccess(res, thread, 'Thread created successfully', 201);
  } catch (error) {
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

    if (thread.created_by.user_id !== req.user.user_id.toString() && req.user.role !== 'admin') {
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

    const updated = await Thread.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

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

    if (thread.created_by.user_id !== req.user.user_id.toString() && req.user.role !== 'admin') {
      sendError(res, 'You can only delete your own threads', 403);
      return;
    }

    // Soft delete
    await Thread.findByIdAndUpdate(id, { is_deleted: true });

    // Decrement topic thread count
    await Topic.findOneAndUpdate(
      { slug: thread.topic_slug },
      { $inc: { thread_count: -1 } },
    );

    sendSuccess(res, null, 'Thread deleted successfully');
  } catch (error) {
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

    const userId = req.user.user_id.toString()  ;
    const hasUpvoted = thread.upvoted_by.includes(userId);

    let updated;
    if (hasUpvoted) {
      // Remove upvote
      updated = await Thread.findByIdAndUpdate(
        id,
        { $pull: { upvoted_by: userId }, $inc: { 'stats.upvotes': -1 } },
        { new: true },
      );
    } else {
      // Add upvote
      updated = await Thread.findByIdAndUpdate(
        id,
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

    await Thread.findByIdAndUpdate(id, { $inc: { 'stats.views': 1 } });

    sendSuccess(res, null, 'View recorded');
  } catch (error) {
    next(error);
  }
};
