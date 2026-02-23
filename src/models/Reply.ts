import { Schema, model, Document, Types } from 'mongoose';

export interface IReplyDocument extends Document {
  thread_id: Types.ObjectId;
  parent_id: Types.ObjectId | null;
  depth: number;
  content: string;
  created_by: {
    user_id: string;
    username: string;
  };
  stats: {
    upvotes: number;
    downvotes: number;
  };
  upvoted_by: string[];
  downvoted_by: string[];
  is_edited: boolean;
  edited_at: Date | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

const ReplySchema = new Schema<IReplyDocument>(
  {
    thread_id: {
      type: Schema.Types.ObjectId,
      ref: 'Thread',
      required: [true, 'Thread ID is required'],
      index: true,
    },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: 'Reply',
      default: null,
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    content: {
      type: String,
      required: [true, 'Reply content is required'],
      trim: true,
      minlength: [1, 'Content cannot be empty'],
      maxlength: [5000, 'Content cannot exceed 5,000 characters'],
    },
    created_by: {
      user_id: { type: String, required: true },
      username: { type: String, required: true },
    },
    stats: {
      upvotes: { type: Number, default: 0, min: 0 },
      downvotes: { type: Number, default: 0, min: 0 },
    },
    upvoted_by: { type: [String], default: [] },
    downvoted_by: { type: [String], default: [] },
    is_edited: { type: Boolean, default: false },
    edited_at: { type: Date, default: null },
    is_deleted: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

ReplySchema.index({ thread_id: 1, parent_id: 1, created_at: 1 });

export const Reply = model<IReplyDocument>('Reply', ReplySchema);
