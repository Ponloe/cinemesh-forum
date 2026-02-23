import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  pagination?: ApiResponse['pagination'],
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    pagination,
  };
  res.status(statusCode).json(response);
};

export const sendError = (res: Response, error: string, statusCode = 500): void => {
  const response: ApiResponse = {
    success: false,
    error,
  };
  res.status(statusCode).json(response);
};


export const getPaginationParams = (
  page?: string,
  limit?: string,
): { page: number; limit: number; skip: number } => {
  const parsedPage = Math.max(1, parseInt(page || '1', 10));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};
