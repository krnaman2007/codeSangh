const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration (Blueprint: CLIENT_ORIGIN, credentials: true)
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
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

// Health check endpoint (Blueprint section 7.3)
app.get(['/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      time: new Date().toISOString(),
    },
  });
});

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

module.exports = app;
