import express from 'express';
import { mastra } from '../src/mastra/index.ts';

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;

// Webhook verification token
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'mastra_webhook_token';

// WhatsApp API configuration
const WHATSAPP_API_BASE = 'https://graph.facebook.com/v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Send WhatsApp message
async function sendWhatsAppMessage(to, message) {
  try {
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.error('❌ WhatsApp API credentials not configured');
      return false;
    }

    const response = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ WhatsApp API error:', response.status, errorBody);
      return false;
    }

    const result = await response.json();
    console.log('✅ WhatsApp message sent successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return false;
  }
}

// Process message with availability agent
async function processWhatsAppMessage(phoneNumber, message, contactName) {
  try {
    console.log(`📱 Processing WhatsApp message from ${contactName || phoneNumber}: "${message}"`);

    const agent = mastra.getAgent('availability');
    if (!agent) {
      console.error('❌ Availability agent not found');
      return 'Sorry, the booking system is temporarily unavailable. Please try again later.';
    }

    const contextualMessage = `[WhatsApp message from ${contactName || phoneNumber}] ${message}`;
    const response = await agent.generate([
      { role: 'user', content: contextualMessage }
    ]);

    const agentResponse = response.text || 'I apologize, but I couldn\'t process your request right now. Please try again.';
    
    console.log('🤖 Agent response generated:', agentResponse);
    return agentResponse;

  } catch (error) {
    console.error('❌ Error processing message with availability agent:', error);
    return 'Sorry, I encountered an error while processing your request. Please try again or contact us at 0758112151.';
  }
}

// WhatsApp webhook verification
app.get('/webhooks/whatsapp', (req, res) => {
  try {
    console.log('🔍 WhatsApp webhook verification request received');
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.error('❌ WhatsApp webhook verification failed');
      res.sendStatus(403);
    }
  } catch (error) {
    console.error('❌ Error in webhook verification:', error);
    res.sendStatus(500);
  }
});

// WhatsApp webhook message handler
app.post('/webhooks/whatsapp', async (req, res) => {
  try {
    console.log('📨 WhatsApp webhook message received');
    console.log('📄 Raw body:', JSON.stringify(req.body, null, 2));

    // Acknowledge receipt immediately
    res.sendStatus(200);

    // Basic validation and processing
    const { entry } = req.body;
    if (entry && entry[0] && entry[0].changes) {
      for (const change of entry[0].changes) {
        if (change.field === 'messages' && change.value.messages) {
          const { messages, contacts } = change.value;
          
          for (const message of messages) {
            if (message.type === 'text') {
              const phoneNumber = message.from;
              const messageText = message.text.body;
              const contactName = contacts?.find(c => c.wa_id === phoneNumber)?.profile.name;

              console.log(`📱 Received text message from ${contactName || phoneNumber}: "${messageText}"`);

              // Process message with availability agent
              const agentResponse = await processWhatsAppMessage(phoneNumber, messageText, contactName);

              // Send response back via WhatsApp
              const messageSent = await sendWhatsAppMessage(phoneNumber, agentResponse);
              
              if (messageSent) {
                console.log('✅ Response sent successfully to WhatsApp');
              } else {
                console.error('❌ Failed to send response to WhatsApp');
              }
            } else {
              console.log(`ℹ️ Received unsupported message type: ${message.type}`);
              await sendWhatsAppMessage(
                message.from, 
                'Sorry, I can only process text messages right now. Please send me your availability question as text. 📝'
              );
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error processing WhatsApp webhook:', error);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Webhook for Mastra Availability Agent',
    environment: process.env.NODE_ENV || 'development',
  });
});

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

// Start server
const server = app.listen(PORT, () => {
  console.log('🎯 WhatsApp Webhook Server for Mastra Availability Agent');
  console.log('📋 This server provides WhatsApp Business API webhook endpoints');
  console.log('🔧 Make sure to configure your environment variables before starting');
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