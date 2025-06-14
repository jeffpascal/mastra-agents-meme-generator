const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;

// Middleware
app.use(express.json({ 
  limit: '10mb',
  verify: function (req, res, buf) {
    // Store raw body for signature verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic webhook handler (without full Mastra integration for compatibility)
function handleTawkWebhook(req, res) {
  try {
    console.log('📨 Tawk.to webhook received');
    console.log('📄 Body:', JSON.stringify(req.body, null, 2));

    // Acknowledge receipt immediately
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received (legacy mode - upgrade Node.js for full functionality)',
      timestamp: new Date().toISOString()
    });

    console.log('✅ Webhook processed in legacy mode');

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Failed to process webhook' 
      });
    }
  }
}

// Health check
function webhookHealthCheck(req, res) {
  res.status(200).json({
    status: 'healthy (legacy mode)',
    timestamp: new Date().toISOString(),
    service: 'Tawk.to Webhook for Mastra Agents (Legacy)',
    nodeVersion: process.version,
    warning: 'Please upgrade to Node.js >=20.9.0 for full functionality',
    supportedEvents: [
      'chat:start',
      'chat:end', 
      'chat:transcript_created',
      'ticket:create'
    ]
  });
}

// Webhook verification
function verifyWebhook(req, res) {
  try {
    const challenge = req.query.challenge;
    
    if (challenge) {
      console.log('🔍 Webhook verification request received');
      res.status(200).send(challenge);
    } else {
      res.status(200).json({ 
        message: 'Webhook endpoint is active (legacy mode)',
        timestamp: new Date().toISOString() 
      });
    }
  } catch (error) {
    console.error('❌ Error in webhook verification:', error);
    res.sendStatus(500);
  }
}

// Routes
app.get('/webhook', verifyWebhook);
app.post('/webhook', handleTawkWebhook);
app.get('/webhooks/tawk', verifyWebhook);
app.post('/webhooks/tawk', handleTawkWebhook);
app.get('/health', webhookHealthCheck);

// Basic info endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Mastra Tawk.to Webhook Server (Legacy Mode)',
    version: '1.0.0',
    nodeVersion: process.version,
    warning: 'Running in legacy mode. Upgrade to Node.js >=20.9.0 for full functionality',
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
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('⚠️  LEGACY MODE: Running with Node.js', process.version);
  console.log('⚠️  Please upgrade to Node.js >=20.9.0 for full functionality');
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

console.log('🎯 Tawk.to Webhook Server for Mastra Agents (Legacy Mode)');
console.log('📋 This server provides basic Tawk.to webhook endpoints');
console.log('🔧 For full agent integration, upgrade to Node.js >=20.9.0'); 