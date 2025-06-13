import { Request, Response } from 'express';
import { mastra } from '../index';
import { z } from 'zod';

// WhatsApp webhook verification token - add this to your .env file
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'mastra_webhook_token';

// WhatsApp webhook schemas based on the API documentation
const WhatsAppContactSchema = z.object({
  profile: z.object({
    name: z.string(),
  }),
  wa_id: z.string(),
});

const WhatsAppTextMessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  text: z.object({
    body: z.string(),
  }),
  type: z.literal('text'),
});

const WhatsAppMessageSchema = z.discriminatedUnion('type', [
  WhatsAppTextMessageSchema,
  // Add more message types here as needed (image, audio, etc.)
]);

const WhatsAppWebhookSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.literal('whatsapp'),
            metadata: z.object({
              display_phone_number: z.string(),
              phone_number_id: z.string(),
            }),
            contacts: z.array(WhatsAppContactSchema).optional(),
            messages: z.array(WhatsAppMessageSchema).optional(),
          }),
          field: z.string(),
        })
      ),
    })
  ),
});

// WhatsApp API configuration
const WHATSAPP_API_BASE = 'https://graph.facebook.com/v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Send a WhatsApp message using the Cloud API
 */
async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
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

/**
 * Process incoming WhatsApp message with the availability agent
 */
async function processWhatsAppMessage(phoneNumber: string, message: string, contactName?: string): Promise<string> {
  try {
    console.log(`📱 Processing WhatsApp message from ${contactName || phoneNumber}: "${message}"`);

    // Get the availability agent and send the message
    const agent = mastra.getAgent('availability');
    if (!agent) {
      console.error('❌ Availability agent not found');
      return 'Sorry, the booking system is temporarily unavailable. Please try again later.';
    }

    // Create a WhatsApp-specific context message to help the agent understand the channel
    const contextualMessage = `[WhatsApp message from ${contactName || phoneNumber}] ${message}`;

    // Generate response using the availability agent
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

/**
 * WhatsApp webhook verification endpoint
 * Called by Meta to verify the webhook URL
 */
export async function verifyWhatsAppWebhook(req: Request, res: Response) {
  try {
    console.log('🔍 WhatsApp webhook verification request received');
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('📋 Verification params:', { mode, token: token ? '***' : 'missing', challenge: challenge ? 'present' : 'missing' });

    // Check if a token and mode were sent
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
}

/**
 * WhatsApp webhook message handler
 * Processes incoming messages and notifications
 */
export async function handleWhatsAppWebhook(req: Request, res: Response) {
  try {
    console.log('📨 WhatsApp webhook message received');
    console.log('📄 Raw body:', JSON.stringify(req.body, null, 2));

    // Acknowledge receipt immediately
    res.sendStatus(200);

    // Validate the webhook payload
    const webhookData = WhatsAppWebhookSchema.parse(req.body);
    
    // Process each entry
    for (const entry of webhookData.entry) {
      for (const change of entry.changes) {
        // Only process messages field
        if (change.field === 'messages' && change.value.messages) {
          const { messages, contacts } = change.value;
          
          // Process each message
          for (const message of messages) {
            // Only handle text messages for now
            if (message.type === 'text') {
              const phoneNumber = message.from;
              const messageText = message.text.body;
              const contactName = contacts?.find((c: any) => c.wa_id === phoneNumber)?.profile.name;

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
              
              // Send a helpful response for unsupported message types
              await sendWhatsAppMessage(
                message.from, 
                'Sorry, I can only process text messages right now. Please send me your availability question as text. 📝'
              );
            }
          }
        } else {
          console.log(`ℹ️ Received non-message webhook: ${change.field}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error processing WhatsApp webhook:', error);
    
    // If we can extract a phone number from the request, send an error message
    try {
      const body = req.body;
      if (body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from) {
        const phoneNumber = body.entry[0].changes[0].value.messages[0].from;
        await sendWhatsAppMessage(
          phoneNumber, 
          'Sorry, I encountered an error. Please try again or contact us at 0758112151. 📞'
        );
      }
    } catch (errorHandlingError) {
      console.error('❌ Error while handling error:', errorHandlingError);
    }
  }
}

/**
 * Health check endpoint for the webhook
 */
export async function webhookHealthCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Webhook for Mastra Availability Agent',
    environment: process.env.NODE_ENV || 'development',
  });
} 