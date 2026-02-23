import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import xss from 'xss';
import { Topic } from '../models/Topic';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, errors.array()[0].msg, 400);
      return;
    }

    const { name, slug, description, icon, gradient } = req.body;

    const topic = await Topic.create({
      name: xss(name),
      slug: xss(slug).toLowerCase(),
      description: description ? xss(description) : '',
      icon: icon || '🎬',
      gradient: gradient || 'from-blue-500 to-purple-600',
    });

    sendSuccess(res, topic, 'Topic created successfully', 201);
  } catch (error) {
    next(error);
  }
};
