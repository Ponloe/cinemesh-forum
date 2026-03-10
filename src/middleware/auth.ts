import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthRequest, AuthUser } from '../types';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  logger.debug('=== Authentication Check ===');
  const authHeader = req.headers.authorization;
  logger.debug(`Auth Header: ${authHeader ? 'Present' : 'Missing'}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required. Please provide a valid token.', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    logger.info(`✓ User authenticated: ${decoded.email}, role: ${decoded.role}`);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'Token has expired. Please log in again.', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 'Invalid token. Please log in again.', 401);
    } else {
      sendError(res, 'Authentication failed.', 401);
    }
  }
};

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
      req.user = decoded;
    } catch {
      // Token invalid, continue without user
    }
  }

  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  logger.debug('=== Admin Check ===');
  
  if (!req.user) {
    logger.error('No user in request');
    sendError(res, 'Authentication required.', 401);
    return;
  }

  logger.debug(`User role: ${req.user.role}`);
  if (req.user.role !== 'admin') {
    logger.error(`Access denied - user role is '${req.user.role}', not 'admin'`);
    sendError(res, 'Admin access required.', 403);
    return;
  }

  logger.info('✓ Admin access granted');
  next();
};