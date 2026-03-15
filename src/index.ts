import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Route imports
import topicRoutes from './routes/topics';
import threadRoutes from './routes/threads';
import replyRoutes from './routes/replies';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Request logging
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Documentation Home Page
app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CineMesh Forum API Documentation</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 40px 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .content { padding: 40px; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #667eea; margin-bottom: 20px; font-size: 1.8em; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .endpoint { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #667eea; }
        .method { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 0.85em; margin-right: 10px; }
        .get { background: #28a745; color: white; }
        .post { background: #007bff; color: white; }
        .patch { background: #ffc107; color: #333; }
        .delete { background: #dc3545; color: white; }
        .path { font-family: 'Courier New', monospace; color: #333; font-weight: 600; font-size: 0.95em; }
        .description { color: #666; margin-top: 8px; line-height: 1.6; }
        .auth-required { display: inline-block; background: #ff6b6b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-left: 10px; }
        .base-url { background: #e9ecef; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; margin-bottom: 30px; }
        code { background: #f1f3f5; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
        .info-box { background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; border-radius: 4px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 CineMesh Forum API</h1>
          <p>RESTful API for managing forum topics, threads, and replies</p>
        </div>
        
        <div class="content">
          <div class="base-url">
            <strong>Base URL:</strong> http://localhost:${config.port}<br>
            <strong>API Base:</strong> http://localhost:${config.port}/api/forum
          </div>

          <div class="section">
            <h2>📁 Topics</h2>
            
            <div class="endpoint">
              <span class="method get">GET</span>
              <span class="path">/api/forum/topics</span>
              <div class="description">Get all topics with pagination<br>
              Query params: <code>page</code> (default: 1), <code>limit</code> (default: 20, max: 100)</div>
            </div>

            <div class="endpoint">
              <span class="method get">GET</span>
              <span class="path">/api/forum/topics/:slug</span>
              <div class="description">Get a specific topic by slug</div>
            </div>

            <div class="endpoint">
              <span class="method post">POST</span>
              <span class="path">/api/forum/topics</span>
              <span class="auth-required">Auth Required</span>
              <div class="description">Create a new topic<br>
              Body: <code>{ "title": "string", "description": "string" }</code></div>
            </div>

            <div class="endpoint">
              <span class="method patch">PATCH</span>
              <span class="path">/api/forum/topics/:slug</span>
              <span class="auth-required">Auth Required</span>
              <div class="description">Update a topic<br>
              Body: <code>{ "title"?: "string", "description"?: "string" }</code></div>
            </div>

            <div class="endpoint">
              <span class="method delete">DELETE</span>
              <span class="path">/api/forum/topics/:slug</span>
              <span class="auth-required">Auth Required</span>
              <div class="description">Delete a topic (also deletes all associated threads and replies)</div>
            </div>
          </div>

          <div class="section">
            <h2>💬 Threads</h2>
            
            <div class="endpoint">
              <span class="method get">GET</span>
              <span class="path">/api/forum/topics/:slug/threads</span>
              <div class="description">Get all threads for a specific topic with pagination<br>
              Query params: <code>page</code>, <code>limit</code></div>
            </div>

            <div class="endpoint">
              <span class="method get">GET</span>
              <span class="path">/api/forum/threads</span>
              <div class="description">Get all threads across all topics with pagination<br>
              Query params: <code>page</code>, <code>limit</code>, <code>topicSlug</code> (optional filter)</div>
            </div>

            <div class="endpoint">
              <span class="method get">GET</span>
              <span class="path">/api/forum/threads/:slug</span>
              <div class="description">Get a specific thread by slug</div>
            </div>

            <div class="endpoint">
              <span class="method post">POST</span>
              <span class="path">/api/forum/topics/:slug/threads</span>
              <span class="auth-required">Auth Required</span>
              <div class="description">Create a new thread in a topic<br>
              Body: <code>{ "title": "string", "content": "string" }</code></div>
            </div>

            <div class="endpoint">
              <span class="method patch">PATCH</span>
              <span class="path">/api/forum/threads/:slug</span>
              <span class="auth-required">Auth Required</span>
              <div class="description">Update a thread<br>
              Body: <code>{ "title"?: "string", "content"?: "string" }</code></div>
            </div>

            <div class="endpoint">
              <span class="method delete">DELETE</span>
              <span class="path">/api/forum/threads/:slug</span>
              <span class="auth-required">Auth Required</span>
              <div class="description">Delete a thread (also deletes all associated replies)</div>
            </div>
          </div>

          <div class="section">
            <h2>💭 Replies</h2>
            
            <div class="endpoint">
              <span class="method get">GET</span>
              <span class="path">/api/forum/threads/:slug/replies</span>
              <div class="description">Get all replies for a specific thread with pagination<br>
              Query params: <code>page</code>, <code>limit</code></div>
            </div>

            <div class="endpoint">
              <span class="method get">GET</span>
              <span class="path">/api/forum/replies/:id</span>
              <div class="description">Get a specific reply by ID</div>
            </div>

            <div class="endpoint">
              <span class="method post">POST</span>
              <span class="path">/api/forum/threads/:slug/replies</span>
              <span class="auth-required">Auth Required</span>
              <div class="description">Create a new reply to a thread<br>
              Body: <code>{ "content": "string", "parentReplyId"?: "string" }</code></div>
            </div>

            <div class="endpoint">
              <span class="method patch">PATCH</span>
              <span class="path">/api/forum/replies/:id</span>
              <span class="auth-required">Auth Required</span>
              <div class="description">Update a reply<br>
              Body: <code>{ "content": "string" }</code></div>
            </div>

            <div class="endpoint">
              <span class="method delete">DELETE</span>
              <span class="path">/api/forum/replies/:id</span>
              <span class="auth-required">Auth Required</span>
              <div class="description">Delete a reply</div>
            </div>
          </div>

          <div class="section">
            <h2>🔑 Authentication</h2>
            <div class="info-box">
              For protected endpoints (marked with auth), include the JWT token in the Authorization header:<br><br>
              <code>Authorization: Bearer YOUR_JWT_TOKEN</code>
            </div>
          </div>

          <div class="section">
            <h2>📊 Response Format</h2>
            <div class="info-box">
              All responses follow this format:<br><br>
              <strong>Success:</strong><br>
              <code>{ "success": true, "data": {...}, "message"?: "string", "pagination"?: {...} }</code><br><br>
              <strong>Error:</strong><br>
              <code>{ "success": false, "error": "string" }</code>
            </div>
          </div>

          <div class="section">
            <h2>🏥 Health Check</h2>
            <div class="endpoint">
              <span class="method get">GET</span>
              <span class="path">/health</span>
              <div class="description">Check API health status</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'CineMesh Forum API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
const API_BASE = '/api/forum';

// Mount routes
app.use(`${API_BASE}/topics/:slug/threads`, threadRoutes); 
app.use(`${API_BASE}/threads`, threadRoutes); // 
app.use(`${API_BASE}/topics`, topicRoutes); //
app.use(`${API_BASE}`, replyRoutes);
app.use(`${API_BASE}`, threadRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  await connectDatabase();

  const server = app.listen(config.port, () => {
    logger.info(`🎬 CineMesh Forum API running on http://localhost:${config.port}`);
    logger.info(`📡 Environment: ${config.nodeEnv}`);
    logger.info(`🌐 CORS origins: ${config.allowedOrigins.join(', ')}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
