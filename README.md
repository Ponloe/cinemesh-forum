# 🎬 CineMesh Forum API

A RESTful backend for CineMesh Forum — a movie discussion platform built with Node.js, Express, TypeScript, and MongoDB.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB with Mongoose ODM
- **Auth**: JWT (token verification from external auth service)
- **Validation**: express-validator
- **Security**: helmet, xss sanitization, CORS

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone and navigate to the project
cd cinemesh-forum

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your values
nano .env

# Start development server
npm run dev
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/cinemesh-forum` | MongoDB connection string |
| `JWT_SECRET` | — | Secret for JWT verification (required in production) |
| `NODE_ENV` | `development` | Environment mode |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |

## API Reference

**Base URL**: `http://localhost:4000/api/forum`

### Health Check
```
GET /health
```

### Topics
```
GET    /topics              → List all topics
GET    /topics/:slug        → Get topic by slug
POST   /topics              → Create topic (auth required)
```

### Threads
```
GET    /topics/:slug/threads      → List threads in topic (paginated)
GET    /threads/:id               → Get single thread
POST   /topics/:slug/threads      → Create thread (auth required)
PATCH  /threads/:id               → Update thread (owner only)
DELETE /threads/:id               → Delete thread (owner/admin)
POST   /threads/:id/upvote        → Toggle upvote (auth required)
POST   /threads/:id/view          → Increment view count
```

### Replies
```
GET    /threads/:id/replies        → Get replies (nested tree)
POST   /threads/:id/replies        → Create top-level reply (auth required)
POST   /replies/:id/replies        → Create nested reply (auth required, max depth 5)
PATCH  /replies/:id                → Update reply (owner only)
DELETE /replies/:id                → Delete reply (owner/admin)
POST   /replies/:id/upvote         → Toggle upvote (auth required)
POST   /replies/:id/downvote       → Toggle downvote (auth required)
```

### Query Parameters (Threads)

| Param | Values | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | 1–100 | Results per page (default: 20) |
| `sort` | `latest`, `popular`, `most_replies` | Sort order (default: `latest`) |
| `search` | string | Full-text search |

## Authentication

Protected routes require a JWT in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

The token should contain: `id`, `email`, `username`, `role`, and optionally `avatar_url`.

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Error description",
  "statusCode": 400
}
```

## Scripts

```bash
npm run dev       # Development with hot reload
npm run build     # Compile TypeScript
npm run start     # Run compiled output
npm run lint      # Lint TypeScript files
npm run lint:fix  # Auto-fix lint issues
```

## Data Models

### ForumTopic
- `name`, `slug` (unique), `description`, `icon`, `gradient`
- `thread_count` — auto-managed

### ForumThread  
- `topic_slug`, `title`, `content`, `created_by`
- `movie_id`, `movie_title` — optional movie link
- `tags` — up to 10 tags
- `stats`: `reply_count`, `upvotes`, `views`
- `is_pinned`, `is_locked`, `is_deleted` (soft delete)

### ForumReply
- `thread_id`, `parent_id` (for nesting), `depth` (max 5)
- `content`, `created_by`
- `stats`: `upvotes`, `downvotes`
- `is_edited`, `edited_at`, `is_deleted` (soft delete)

## Features

- ✅ Nested replies (up to 5 levels)
- ✅ Vote deduplication per user
- ✅ Soft deletes
- ✅ Pagination & sorting
- ✅ Full-text search on threads
- ✅ View tracking
- ✅ XSS sanitization
- ✅ Request validation
- ✅ Graceful shutdown
- ✅ Structured logging
