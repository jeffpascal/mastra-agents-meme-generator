import { createRequire } from 'module';
import { Request, Response, NextFunction } from 'express';
import { handleTawkWebhook, webhookHealthCheck, verifyWebhook } from './tawk';

const require = createRequire(import.meta.url);
const express = require('express');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;

// Middleware
app.use(express.json({ 
  limit: '10mb',
  verify: function (req: Request, res: Response, buf: Buffer) {
    // Store raw body for signature verification
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Tawk.to webhook routes
app.get('/webhook', verifyWebhook);
app.post('/webhook', handleTawkWebhook);

// Alternative webhook endpoint (for flexibility)
app.get('/webhooks/tawk', verifyWebhook);
app.post('/webhooks/tawk', handleTawkWebhook);

// Health check endpoint
app.get('/health', webhookHealthCheck);

// Basic info endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Mastra Tawk.to Webhook Server',
    version: '1.0.0',
    endpoints: {
      webhook: '/webhook',
      tawk_webhook: '/webhooks/tawk',
      health: '/health'
    },
    supportedEvents: [
      'chat:start',
      'chat:end',
      'chat:transcript_created',
      'ticket:create'
    ],
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Tawk.to Webhook Server running on port ${PORT}`);
  console.log(`💬 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`💬 Alternative URL: http://localhost:${PORT}/webhooks/tawk`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`ℹ️  Server info: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

export { app, server }; 