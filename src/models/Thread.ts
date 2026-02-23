import { Schema, model, Document } from 'mongoose';

export interface IThreadDocument extends Document {
  slug: string;
  topic_slug: string;
  movie_id?: number;
  movie_title?: string;
  title: string;
  content: string;
  created_by: {
    user_id: string;
    username: string;
    avatar_url?: string;
  };
  tags: string[];
  stats: {
    reply_count: number;
    upvotes: number;
    views: number;
  };
  upvoted_by: string[];
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
}

const ThreadSchema = new Schema<IThreadDocument>(
  {
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    topic_slug: {
      type: String,
      required: [true, 'Topic slug is required'],
      index: true,
    },
    movie_id: {
      type: Number,
      default: null,
    },
    movie_title: {
      type: String,
      trim: true,
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Thread title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Thread content is required'],
      trim: true,
      minlength: [10, 'Content must be at least 10 characters'],
      maxlength: [10000, 'Content cannot exceed 10,000 characters'],
    },
    created_by: {
      user_id: { type: String, required: true },
      username: { type: String, required: true },
      avatar_url: { type: String, default: null },
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]) => tags.length <= 10,
        message: 'Cannot have more than 10 tags',
      },
    },
    stats: {
      reply_count: { type: Number, default: 0, min: 0 },
      upvotes: { type: Number, default: 0, min: 0 },
      views: { type: Number, default: 0, min: 0 },
    },
    upvoted_by: {
      type: [String],
      default: [],
    },
    is_pinned: { type: Boolean, default: false },
    is_locked: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
    last_activity_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

// Generate slug before saving
ThreadSchema.pre('save', async function (next) {
  if (!this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Check for uniqueness
    let slug = baseSlug;
    let counter = 1;
    
    while (await model<IThreadDocument>('Thread').findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Compound index for efficient topic thread queries
ThreadSchema.index({ topic_slug: 1, is_deleted: 1, last_activity_at: -1 });
ThreadSchema.index({ topic_slug: 1, is_deleted: 1, 'stats.upvotes': -1 });
ThreadSchema.index({ title: 'text', content: 'text' });

export const Thread = model<IThreadDocument>('Thread', ThreadSchema);