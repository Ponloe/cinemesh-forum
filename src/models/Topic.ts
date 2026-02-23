import { Schema, model, Document } from 'mongoose';

export interface ITopicDocument extends Document {
  name: string;
  slug: string;
  description: string;
  thread_count: number;
  icon: string;
  gradient: string;
  created_at: Date;
  updated_at: Date;
}

const TopicSchema = new Schema<ITopicDocument>(
  {
    name: {
      type: String,
      required: [true, 'Topic name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Topic slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    thread_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    icon: {
      type: String,
      default: '🎬',
    },
    gradient: {
      type: String,
      default: 'from-blue-500 to-purple-600',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export const Topic = model<ITopicDocument>('Topic', TopicSchema);
