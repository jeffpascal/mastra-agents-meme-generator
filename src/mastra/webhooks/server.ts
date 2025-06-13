import express from 'express';
import { verifyWhatsAppWebhook, handleWhatsAppWebhook, webhookHealthCheck } from './whatsapp';

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;

// Middleware
app.use(express.json({ limit: '10mb' })); // WhatsApp webhook payloads can be up to 3MB
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// WhatsApp webhook routes
app.get('/webhooks/whatsapp', verifyWhatsAppWebhook);
app.post('/webhooks/whatsapp', handleWhatsAppWebhook);

// Health check endpoint
app.get('/health', webhookHealthCheck);

// Basic info endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Mastra WhatsApp Webhook Server',
    version: '1.0.0',
    endpoints: {
      whatsapp_webhook: '/webhooks/whatsapp',
      health: '/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Webhook Server running on port ${PORT}`);
  console.log(`📱 WhatsApp webhook URL: http://localhost:${PORT}/webhooks/whatsapp`);
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