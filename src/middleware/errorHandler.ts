import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { logger } from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
  path?: string;
  value?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(`Error: ${err.message}`);

  // Mongoose validation error
  if (err instanceof MongooseError.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({
      success: false,
      error: errors.join(', '),
      statusCode: 400,
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof MongooseError.CastError) {
    res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`,
      statusCode: 400,
    });
    return;
  }

  // MongoDB duplicate key error
  if (err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    res.status(409).json({
      success: false,
      error: `A record with this ${field} already exists.`,
      statusCode: 409,
    });
    return;
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
  });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    statusCode: 404,
  });
};
