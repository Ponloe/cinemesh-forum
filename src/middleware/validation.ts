import { body, param, query } from 'express-validator';

export const topicValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('slug')
      .trim()
      .notEmpty().withMessage('Slug is required')
      .matches(/^[a-z0-9-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('icon').optional().trim(),
    body('gradient').optional().trim(),
  ],
};

export const threadValidation = {
  create: [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 3 }).withMessage('Title must be at least 3 characters')
      .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('content')
      .trim()
      .notEmpty().withMessage('Content is required')
      .isLength({ min: 10 }).withMessage('Content must be at least 10 characters')
      .isLength({ max: 10000 }).withMessage('Content cannot exceed 10,000 characters'),
    body('movie_id').optional().isNumeric().withMessage('movie_id must be a number'),
    body('movie_title').optional().trim().isLength({ max: 200 }),
    body('tags')
      .optional()
      .isArray({ max: 10 }).withMessage('Cannot have more than 10 tags'),
    body('tags.*').optional().trim().isString().isLength({ max: 30 }),
    // Accept created_by with either string or number user_id
    body('created_by').optional().isObject().withMessage('created_by must be an object'),
    body('created_by.user_id').optional().notEmpty().withMessage('user_id is required'),
    body('created_by.username').optional().isString().notEmpty().withMessage('username is required'),
    body('created_by.avatar_url').optional(),
  ],
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3 }).withMessage('Title must be at least 3 characters')
      .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('content')
      .optional()
      .trim()
      .isLength({ min: 10 }).withMessage('Content must be at least 10 characters')
      .isLength({ max: 10000 }).withMessage('Content cannot exceed 10,000 characters'),
    body('tags').optional().isArray({ max: 10 }),
  ],
};

export const replyValidation = {
  create: [
    body('content')
      .trim()
      .notEmpty().withMessage('Content is required')
      .isLength({ max: 5000 }).withMessage('Content cannot exceed 5,000 characters'),
    body('created_by').optional().isObject(),
    body('created_by.user_id').optional().notEmpty(),
    body('created_by.username').optional().isString().notEmpty(),
    body('created_by.avatar_url').optional(),
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid reply ID'),
    body('content')
      .trim()
      .notEmpty().withMessage('Content is required')
      .isLength({ max: 5000 }).withMessage('Content cannot exceed 5,000 characters'),
  ],
};

export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort').optional().isIn(['latest', 'popular', 'most_replies']).withMessage('Invalid sort option'),
  query('search').optional().trim().isLength({ max: 200 }),
];