import { Request, Response } from 'express';
import { mastra } from '../index';
import { z } from 'zod';
import crypto from 'crypto';

// Tawk.to webhook verification secret - add this to your .env file
const WEBHOOK_SECRET = process.env.TAWK_WEBHOOK_SECRET || 'your_webhook_secret_here';

// Tawk.to webhook schemas based on the API documentation
const TawkVisitorSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const TawkPropertySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const TawkSenderSchema = z.object({
  type: z.enum(['visitor', 'agent', 'system']),
});

const TawkMessageSchema = z.object({
  text: z.string(),
  type: z.enum(['msg', 'file', 'webrtc-call']),
  sender: TawkSenderSchema,
});

// Chat start event schema
const TawkChatStartSchema = z.object({
  event: z.literal('chat:start'),
  chatId: z.string(),
  time: z.string(),
  message: TawkMessageSchema,
  visitor: TawkVisitorSchema,
  property: TawkPropertySchema,
});

// Chat end event schema
const TawkChatEndSchema = z.object({
  event: z.literal('chat:end'),
  chatId: z.string(),
  time: z.string(),
  visitor: TawkVisitorSchema,
  property: TawkPropertySchema,
});

// Chat transcript sender schema (different format)
const TawkTranscriptSenderSchema = z.object({
  t: z.enum(['v', 'a', 's']), // visitor, agent, system
  n: z.string().optional(), // name (for agent/system)
  id: z.string().optional(), // id (for agent)
});

// Chat transcript message schema
const TawkTranscriptMessageSchema = z.object({
  sender: TawkTranscriptSenderSchema,
  type: z.string(),
  msg: z.string(),
  time: z.string(),
  attchs: z.array(z.any()).optional(), // attachments
});

// Chat transcript event schema
const TawkChatTranscriptSchema = z.object({
  event: z.literal('chat:transcript_created'),
  time: z.string(),
  property: TawkPropertySchema,
  chat: z.object({
    id: z.string(),
    visitor: TawkVisitorSchema,
    messages: z.array(TawkTranscriptMessageSchema),
  }),
});

// Ticket event schema
const TawkTicketCreateSchema = z.object({
  event: z.literal('ticket:create'),
  time: z.string(),
  property: TawkPropertySchema,
  requester: z.object({
    name: z.string(),
    email: z.string(),
    type: z.string().optional(),
  }),
  ticket: z.object({
    id: z.string(),
    humanId: z.number(),
    subject: z.string(),
    message: z.string(),
  }),
});

// Union of all tawk.to webhook events
const TawkWebhookSchema = z.discriminatedUnion('event', [
  TawkChatStartSchema,
  TawkChatEndSchema,
  TawkChatTranscriptSchema,
  TawkTicketCreateSchema,
]);

/**
 * Verify tawk.to webhook signature using HMAC-SHA1
 */
function verifyTawkSignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET || !signature) {
    return false;
  }

  const digest = crypto
    .createHmac('sha1', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return signature === digest;
}

/**
 * Process incoming chat message with the meme generator agent
 */
async function processChatMessage(
  chatId: string, 
  message: string, 
  visitorName: string,
  visitorEmail?: string
): Promise<string> {
  try {
    console.log(`💬 Processing chat message from ${visitorName} (${chatId}): "${message}"`);

    // Get the meme generator agent
    const agent = mastra.getAgent('memeGenerator');
    if (!agent) {
      console.error('❌ Meme generator agent not found');
      return "Sorry, I'm having trouble accessing my meme generation capabilities right now. Please try again later! 🤖";
    }

    // Create a context message to help the agent understand the channel
    const contextualMessage = `[Chat message from ${visitorName}${visitorEmail ? ` (${visitorEmail})` : ''}] ${message}`;

    // Generate response using the meme generator agent
    const response = await agent.generate([
      { role: 'user', content: contextualMessage }
    ]);

    const agentResponse = response.text || "I apologize, but I couldn't process your request right now. Please try again! 🎭";
    
    console.log('🤖 Agent response generated:', agentResponse);
    return agentResponse;

  } catch (error) {
    console.error('❌ Error processing chat message:', error);
    return 'Sorry, I encountered an error while processing your request. Please try again! 🙏';
  }
}

/**
 * Process ticket creation with the availability agent
 */
async function processTicketCreation(
  ticketId: string,
  subject: string,
  message: string,
  requesterName: string,
  requesterEmail: string
): Promise<string> {
  try {
    console.log(`🎫 Processing ticket creation from ${requesterName}: "${subject}"`);

    // Get the availability agent for ticket handling
    const agent = mastra.getAgent('availability');
    if (!agent) {
      console.error('❌ Availability agent not found');
      return "Thank you for your ticket. We'll get back to you soon!";
    }

    // Create a context message for ticket processing
    const contextualMessage = `[Support ticket from ${requesterName} (${requesterEmail})] Subject: ${subject}\nMessage: ${message}`;

    // Generate response using the availability agent
    const response = await agent.generate([
      { role: 'user', content: contextualMessage }
    ]);

    const agentResponse = response.text || "Thank you for your ticket. We're processing your request and will respond soon!";
    
    console.log('🤖 Ticket response generated:', agentResponse);
    return agentResponse;

  } catch (error) {
    console.error('❌ Error processing ticket:', error);
    return 'Thank you for your ticket. We have received it and will respond as soon as possible.';
  }
}

/**
 * Generic webhook handler for tawk.to events
 */
export async function handleTawkWebhook(req: Request, res: Response) {
  try {
    console.log('📨 Tawk.to webhook received');
    console.log('📄 Raw body:', JSON.stringify(req.body, null, 2));

    // Get the raw body for signature verification
    const rawBody = (req as any).rawBody?.toString() || JSON.stringify(req.body);
    const signature = req.headers['x-tawk-signature'] as string;
    const eventId = req.headers['x-hook-event-id'] as string;

    console.log('🔐 Signature verification:', { 
      hasSignature: !!signature, 
      hasSecret: !!WEBHOOK_SECRET,
      eventId 
    });

    // Verify webhook signature
    if (!verifyTawkSignature(rawBody, signature)) {
      console.error('❌ Tawk.to webhook signature verification failed');
      return res.status(403).json({ error: 'Signature verification failed' });
    }

    console.log('✅ Webhook signature verified');

    // Acknowledge receipt immediately
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received and processed',
      eventId 
    });

    // Validate the webhook payload
    const webhookData = TawkWebhookSchema.parse(req.body);
    
    // Process based on event type
    switch (webhookData.event) {
      case 'chat:start':
        console.log(`🚀 Chat started: ${webhookData.chatId}`);
        
        // Only process visitor messages
        if (webhookData.message.sender.type === 'visitor') {
          const response = await processChatMessage(
            webhookData.chatId,
            webhookData.message.text,
            webhookData.visitor.name,
            webhookData.visitor.email
          );
          
          console.log(`💬 Generated response for chat ${webhookData.chatId}:`, response);
          // Note: tawk.to doesn't provide a direct API to send messages back via webhooks
          // You would need to use their REST API separately to send responses
        }
        break;

      case 'chat:end':
        console.log(`🏁 Chat ended: ${webhookData.chatId}`);
        // Could be used for analytics or cleanup
        break;

      case 'chat:transcript_created':
        console.log(`📝 Chat transcript created for: ${webhookData.chat.id}`);
        
        // Process the last visitor messages if needed
        const visitorMessages = webhookData.chat.messages.filter(
          msg => msg.sender.t === 'v' && msg.type === 'msg'
        );
        
        if (visitorMessages.length > 0) {
          const lastMessage = visitorMessages[visitorMessages.length - 1];
          console.log(`📋 Last visitor message: "${lastMessage.msg}"`);
          // Could process transcript for analytics or follow-up
        }
        break;

      case 'ticket:create':
        console.log(`🎫 Ticket created: ${webhookData.ticket.id}`);
        
        const ticketResponse = await processTicketCreation(
          webhookData.ticket.id,
          webhookData.ticket.subject,
          webhookData.ticket.message,
          webhookData.requester.name,
          webhookData.requester.email
        );
        
        console.log(`🎫 Generated ticket response:`, ticketResponse);
        // Note: Could be used to auto-respond or route tickets
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${(webhookData as any).event}`);
    }

  } catch (error) {
    console.error('❌ Error processing tawk.to webhook:', error);
    
    // If we've already sent a response, don't send another
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Failed to process webhook' 
      });
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
    service: 'Tawk.to Webhook for Mastra Agents',
    environment: process.env.NODE_ENV || 'development',
    supportedEvents: [
      'chat:start',
      'chat:end', 
      'chat:transcript_created',
      'ticket:create'
    ],
    signatureVerification: !!WEBHOOK_SECRET,
  });
}

/**
 * Generic webhook verification endpoint (optional, for testing)
 */
export async function verifyWebhook(req: Request, res: Response) {
  try {
    const challenge = req.query.challenge;
    
    if (challenge) {
      console.log('🔍 Webhook verification request received');
      res.status(200).send(challenge);
    } else {
      res.status(200).json({ 
        message: 'Webhook endpoint is active',
        timestamp: new Date().toISOString() 
      });
    }
  } catch (error) {
    console.error('❌ Error in webhook verification:', error);
    res.sendStatus(500);
  }
} 