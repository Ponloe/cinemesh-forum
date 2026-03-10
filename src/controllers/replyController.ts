import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import xss from 'xss';
import { Types } from 'mongoose';
import { Reply } from '../models/Reply';
import { Thread } from '../models/Thread';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPaginationParams } from '../utils/response';
import { logger } from '../utils/logger';

interface ReplyWithChildren extends ReturnType<typeof Reply.prototype.toObject> {
  children?: ReplyWithChildren[];
}

// Build nested reply tree
const buildReplyTree = (replies: ReplyWithChildren[]): ReplyWithChildren[] => {
  const map = new Map<string, ReplyWithChildren>();
  const roots: ReplyWithChildren[] = [];

  replies.forEach((reply) => {
    reply.children = [];
    map.set(reply._id.toString(), reply);
  });

  replies.forEach((reply) => {
    if (reply.parent_id) {
      const parent = map.get(reply.parent_id.toString());
      if (parent) {
        parent.children!.push(reply);
      } else {
        roots.push(reply);
      }
    } else {
      roots.push(reply);
    }
  });

  return roots;
};

export const getRepliesByThread = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query as Record<string, string>;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(page, limit);

    const thread = await Thread.findOne({ slug: id, is_deleted: false });
    if (!thread) {
      sendError(res, 'Thread not found', 404);
      return;
    }

    const [replies, total] = await Promise.all([
      Reply.find({ thread_id: thread._id, is_deleted: false, depth: 0 })
        .sort({ created_at: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reply.countDocuments({ thread_id: thread._id, is_deleted: false, depth: 0 }),
    ]);

    // Get all nested replies for these top-level replies
    const allNested = await Reply.find({
      thread_id: thread._id,
      is_deleted: false,
      depth: { $gt: 0 },
    })
      .sort({ depth: 1, created_at: 1 })
      .lean();

    const allReplies = [...replies, ...allNested] as ReplyWithChildren[];
    const tree = buildReplyTree(allReplies);

    sendSuccess(res, tree, 'Replies retrieved successfully', 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const createReply = async (
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

    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { id: threadSlug } = req.params;
    const { content } = req.body;

    // Change from _id to slug lookup
    const thread = await Thread.findOne({ slug: threadSlug, is_deleted: false });
    if (!thread) {
      sendError(res, 'Thread not found', 404);
      return;
    }

    if (thread.is_locked && req.user.role !== 'admin') {
      sendError(res, 'Thread is locked. No new replies allowed.', 403);
      return;
    }

    const reply = await Reply.create({
      thread_id: thread._id, // Use the actual ObjectId
      parent_id: null,
      depth: 0,
      content: xss(content),
      created_by: {
        user_id: req.user.user_id.toString(),
        username: req.user.email.split('@')[0],
      },
    });

    // Update thread stats using actual _id
    await Thread.findByIdAndUpdate(thread._id, {
      $inc: { 'stats.reply_count': 1 },
      last_activity_at: new Date(),
    });

    sendSuccess(res, reply, 'Reply created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const createNestedReply = async (
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

    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { id: parentId } = req.params;
    const { content } = req.body;

    const parentReply = await Reply.findOne({ _id: parentId, is_deleted: false });
    if (!parentReply) {
      sendError(res, 'Parent reply not found', 404);
      return;
    }

    if (parentReply.depth >= 5) {
      sendError(res, 'Maximum nesting depth (5) reached', 400);
      return;
    }

    const thread = await Thread.findOne({ _id: parentReply.thread_id, is_deleted: false });
    if (!thread) {
      sendError(res, 'Thread not found', 404);
      return;
    }

    if (thread.is_locked && req.user.role !== 'admin') {
      sendError(res, 'Thread is locked. No new replies allowed.', 403);
      return;
    }

    const reply = await Reply.create({
      thread_id: parentReply.thread_id,
      parent_id: new Types.ObjectId(parentId),
      depth: parentReply.depth + 1,
      content: xss(content),
      created_by: {
        user_id: req.user.user_id.toString(),
        username: req.user.email.split('@')[0],
      },
    });

    // Update thread stats and last activity
    await Thread.findByIdAndUpdate(parentReply.thread_id, {
      $inc: { 'stats.reply_count': 1 },
      last_activity_at: new Date(),
    });

    sendSuccess(res, reply, 'Reply created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateReply = async (
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

    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const { content } = req.body;

    const reply = await Reply.findOne({ _id: id, is_deleted: false });
    if (!reply) {
      sendError(res, 'Reply not found', 404);
      return;
    }

    if (reply.created_by.user_id.toString() !== req.user.user_id.toString() && req.user.role !== 'admin') {
      sendError(res, 'You can only edit your own replies', 403);
      return;
    }

    const updated = await Reply.findByIdAndUpdate(
      id,
      { content: xss(content), is_edited: true, edited_at: new Date() },
      { new: true, runValidators: true },
    );

    sendSuccess(res, updated, 'Reply updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteReply = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const reply = await Reply.findOne({ _id: id, is_deleted: false });

    if (!reply) {
      sendError(res, 'Reply not found', 404);
      return;
    }

    if (reply.created_by.user_id !== req.user.user_id.toString() && req.user.role !== 'admin') {
      sendError(res, 'You can only delete your own replies', 403);
      return;
    }

    // Soft delete this reply
    await Reply.findByIdAndUpdate(id, { is_deleted: true });

    // Cascade soft delete all nested replies (children)
    const deletedNested = await Reply.updateMany(
      { parent_id: id },
      { $set: { is_deleted: true } }
    );

    // Decrement thread reply count (count this reply + nested ones)
    const totalDeleted = 1 + deletedNested.modifiedCount;
    await Thread.findByIdAndUpdate(
      reply.thread_id, 
      { $inc: { 'stats.reply_count': -totalDeleted } }
    );

    logger.info(`✓ Deleted reply with ${deletedNested.modifiedCount} nested replies`);
    sendSuccess(res, null, `Reply and ${deletedNested.modifiedCount} nested replies deleted successfully`);
  } catch (error) {
    next(error);
  }
};
export const upvoteReply = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const reply = await Reply.findOne({ _id: id, is_deleted: false });

    if (!reply) {
      sendError(res, 'Reply not found', 404);
      return;
    }

    const userId = req.user.user_id.toString();
    const hasUpvoted = reply.upvoted_by.includes(userId);

    let updated;
    if (hasUpvoted) {
      updated = await Reply.findByIdAndUpdate(
        id,
        { $pull: { upvoted_by: userId }, $inc: { 'stats.upvotes': -1 } },
        { new: true },
      );
    } else {
      // Remove downvote if exists
      await Reply.findByIdAndUpdate(id, {
        $pull: { downvoted_by: userId },
        $inc: { 'stats.downvotes': reply.downvoted_by.includes(userId) ? -1 : 0 },
      });

      updated = await Reply.findByIdAndUpdate(
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

export const downvoteReply = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const reply = await Reply.findOne({ _id: id, is_deleted: false });

    if (!reply) {
      sendError(res, 'Reply not found', 404);
      return;
    }

    const userId = req.user.user_id.toString();
    const hasDownvoted = reply.downvoted_by.includes(userId);

    let updated;
    if (hasDownvoted) {
      updated = await Reply.findByIdAndUpdate(
        id,
        { $pull: { downvoted_by: userId }, $inc: { 'stats.downvotes': -1 } },
        { new: true },
      );
    } else {
      // Remove upvote if exists
      await Reply.findByIdAndUpdate(id, {
        $pull: { upvoted_by: userId },
        $inc: { 'stats.upvotes': reply.upvoted_by.includes(userId) ? -1 : 0 },
      });

      updated = await Reply.findByIdAndUpdate(
        id,
        { $addToSet: { downvoted_by: userId }, $inc: { 'stats.downvotes': 1 } },
        { new: true },
      );
    }

    sendSuccess(
      res,
      { downvotes: updated?.stats.downvotes, downvoted: !hasDownvoted },
      'Vote recorded',
    );
  } catch (error) {
    next(error);
  }
};