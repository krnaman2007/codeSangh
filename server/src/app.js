import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import env from './config/env.js';
import apiRoutes from './routes/index.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration (Blueprint: CLIENT_ORIGIN, credentials: true)
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);

// Body parsers (Blueprint: json(2mb))
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Cookie parser for refresh tokens
app.use(cookieParser());

// HTTP request logger
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Mount REST API routes under /api/v1
app.use('/api/v1', apiRoutes);

// Root liveness check shortcut (/health -> delegates to /api/v1/health)
app.use('/', apiRoutes);

// 404 handler for unhandled routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Central error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error('[Server Error]', err);

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal server error',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

export default app;
