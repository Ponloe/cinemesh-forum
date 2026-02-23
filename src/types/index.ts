import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthUser {
  user_id: number;
  email: string;
  role: string;
  sub: string;
  exp: number;
  iat: number;
  username?: string;
  avatar_url?: string;
}

export interface AuthRequest extends Request {
  user?: {
    user_id: number;
    email: string;
    role: string;
    sub: string;
    exp: number;
    iat: number;
    username?: string;
    avatar_url?: string;
  };
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  search?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Forum Topic
export interface IForumTopic {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  thread_count: number;
  icon: string;
  gradient: string;
  created_at: Date;
  updated_at: Date;
}

// Forum Thread
export interface ICreatedBy {
  user_id: string;
  username: string;
  avatar_url?: string;
}

export interface IThreadStats {
  reply_count: number;
  upvotes: number;
  views: number;
}

export interface IForumThread {
  _id: Types.ObjectId;
  topic_slug: string;
  movie_id?: number;
  movie_title?: string;
  title: string;
  content: string;
  created_by: ICreatedBy;
  tags: string[];
  stats: IThreadStats;
  upvoted_by: string[];
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
}

// Forum Reply
export interface IReplyStats {
  upvotes: number;
  downvotes: number;
}

export interface IForumReply {
  _id: Types.ObjectId;
  thread_id: Types.ObjectId;
  parent_id: Types.ObjectId | null;
  depth: number;
  content: string;
  created_by: {
    user_id: string;
    username: string;
  };
  stats: IReplyStats;
  upvoted_by: string[];
  downvoted_by: string[];
  is_edited: boolean;
  edited_at: Date | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}
