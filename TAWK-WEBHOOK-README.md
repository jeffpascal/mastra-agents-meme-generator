# Tawk.to Webhook Integration for Mastra Agents

This document provides a complete guide for setting up a Tawk.to webhook that integrates with Mastra agents for intelligent chat responses and meme generation.

## 🎯 Overview

The Tawk.to webhook enables automated responses to live chat events, allowing your agents to:

- Process chat messages with the meme generator agent
- Handle support tickets with the availability agent
- Provide personalized responses with memory integration
- Process chat transcripts for analytics
- Respond to various chat lifecycle events

## 🚀 Quick Start

### 1. Prerequisites

Before setting up the webhook, ensure you have:

- **Tawk.to Account**: A tawk.to account with admin access
- **Property Setup**: At least one property configured in tawk.to
- **Webhook Endpoint**: A publicly accessible HTTPS endpoint
- **Mastra Setup**: Working Mastra environment with agents configured
- **API Credentials**: OpenAI and Mem0 API keys

### 2. Environment Configuration

Copy the environment variables to your `.env` file:

```env
# Tawk.to Webhook Configuration (required)
TAWK_WEBHOOK_SECRET=your_webhook_secret_here
WEBHOOK_PORT=3001

# OpenAI Configuration (required for AI responses)
OPENAI_API_KEY=your_openai_api_key_here

# Mem0 Configuration (required for memory features)
MEM0_API_KEY=your_mem0_api_key_here

# Optional: Imgflip credentials for meme generation
IMGFLIP_USERNAME=your_imgflip_username
IMGFLIP_PASSWORD=your_imgflip_password
```

### 3. Getting Your Webhook Secret

#### Step 1: Access Tawk.to Dashboard
1. Log in to your [tawk.to dashboard](https://dashboard.tawk.to/)
2. Select your property
3. Go to **Administration** → **Settings** → **Webhooks**

#### Step 2: Create Webhook
1. Click **Create Webhook**
2. Enter a descriptive name (e.g., "Mastra Agent Integration")
3. Set the endpoint URL to: `https://your-domain.com/webhook`
4. Select the events you want to handle:
   - ✅ **Chat Start** - For processing new chat messages
   - ✅ **Chat End** - For cleanup and analytics
   - ✅ **New Chat Transcript** - For full conversation analysis
   - ✅ **New Ticket** - For support ticket handling
5. Generate or set a **Secret Key** - this becomes your `TAWK_WEBHOOK_SECRET`
6. Save the webhook configuration

### 4. Start the Webhook Server

```bash
# Install dependencies if not already done
npm install

# Start the webhook server
npm run webhook
```

The server will start on port 3001 and display:

```
🚀 Tawk.to Webhook Server running on port 3001
💬 Webhook URL: http://localhost:3001/webhook
💬 Alternative URL: http://localhost:3001/webhooks/tawk
🔍 Health check: http://localhost:3001/health
ℹ️  Server info: http://localhost:3001/
```

## 🔧 Webhook Events

The webhook handles four main types of events from tawk.to:

### 1. Chat Start Event

Triggered when a visitor sends the first message in a chat.

**Example payload:**
```json
{
  "event": "chat:start",
  "chatId": "70fe3290-99ad-11e9-a30a-51567162179f",
  "time": "2024-01-15T14:03:04.646Z",
  "message": {
    "text": "I need help creating a meme",
    "type": "msg",
    "sender": {
      "type": "visitor"
    }
  },
  "visitor": {
    "name": "John Doe",
    "email": "john@example.com",
    "city": "New York",
    "country": "US"
  },
  "property": {
    "id": "58ca8453b8a7e060cd3b1ecb",
    "name": "My Website"
  }
}
```

**Processing:** The meme generator agent processes visitor messages and generates appropriate responses.

### 2. Chat End Event

Triggered when a chat session ends.

**Processing:** Used for cleanup and analytics. No direct response generated.

### 3. Chat Transcript Created Event

Triggered after a complete chat session with full message history.

**Processing:** Can be used for conversation analysis and follow-up actions.

### 4. Ticket Created Event

Triggered when a new support ticket is created.

**Example payload:**
```json
{
  "event": "ticket:create",
  "time": "2024-01-15T14:07:13.512Z",
  "property": {
    "id": "58ca8453b8a7e060cd3b1ecb",
    "name": "My Website"
  },
  "requester": {
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "ticket": {
    "id": "02598050-99ae-11e9-8887-97564881b95b",
    "humanId": 3,
    "subject": "Need help with availability",
    "message": "I can't find available dates for booking"
  }
}
```

**Processing:** The availability agent processes tickets and generates helpful responses.

## 🤖 Agent Integration

### Meme Generator Agent

Processes chat messages to create meme-related responses:

```typescript
// Example processing
const agent = mastra.getAgent('memeGenerator');
const response = await agent.generate([
  { role: 'user', content: '[Chat message from John Doe] I need help creating a meme' }
]);
```

### Availability Agent

Handles support tickets and availability-related queries:

```typescript
// Example processing
const agent = mastra.getAgent('availability');
const response = await agent.generate([
  { role: 'user', content: '[Support ticket from Jane Smith] Need help with availability' }
]);
```

## 🔒 Security

### Webhook Signature Verification

All webhook requests are verified using HMAC-SHA1 signatures:

```typescript
function verifyTawkSignature(body: string, signature: string): boolean {
  const digest = crypto
    .createHmac('sha1', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return signature === digest;
}
```

### Headers

- `X-Tawk-Signature`: HMAC-SHA1 signature of the request body
- `X-Hook-Event-Id`: Unique event identifier (consistent across retries)

## 📊 Monitoring

### Health Checks

Monitor webhook health:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "Tawk.to Webhook for Mastra Agents",
  "environment": "development",
  "supportedEvents": [
    "chat:start",
    "chat:end",
    "chat:transcript_created",
    "ticket:create"
  ],
  "signatureVerification": true
}
```

### Logging

The webhook provides detailed logging:

```
💬 Processing chat message from John Doe (70fe3290-99ad-11e9-a30a-51567162179f): "I need help creating a meme"
🤖 Agent response generated: Here's how you can create a funny meme...
🎫 Processing ticket creation from Jane Smith: "Need help with availability"
```

## 🚀 Deployment

### Docker Deployment

Use the included Docker configuration:

```bash
# Production
make run-all              # Start both main app and webhook
make logs-webhook         # Monitor webhook logs

# Development
make run-all-dev          # Start with hot reload
make logs-webhook-dev     # Monitor development logs
```

### Environment Setup

1. **Set up your `.env` file** with the required variables
2. **Configure your webhook URL** in tawk.to dashboard
3. **Test the webhook** using tawk.to's test feature

### HTTPS Requirements

Tawk.to requires HTTPS for webhook endpoints. For production:

- Use a reverse proxy (nginx, Apache) with SSL certificates
- Deploy to platforms that provide HTTPS (Heroku, Vercel, AWS)
- Use ngrok for local testing: `ngrok http 3001`

## 🔧 Configuration

### Webhook URL Format

Your webhook URL should be accessible at:
- Primary: `https://your-domain.com/webhook`
- Alternative: `https://your-domain.com/webhooks/tawk`

### Retry Policy

Tawk.to will retry failed webhook calls:
- Up to 12 hours of retries
- 30-second timeout per request
- Same event ID across retries

## 🛠️ Customization

### Adding Custom Agents

To integrate additional agents:

```typescript
// In processChatMessage function
const customAgent = mastra.getAgent('yourCustomAgent');
const response = await customAgent.generate([
  { role: 'user', content: contextualMessage }
]);
```

### Custom Event Processing

Add custom logic for specific events:

```typescript
switch (webhookData.event) {
  case 'chat:start':
    // Your custom chat start logic
    break;
  case 'ticket:create':
    // Your custom ticket handling
    break;
}
```

## 🔍 Troubleshooting

### Common Issues

**1. Signature verification fails**
```
❌ Tawk.to webhook signature verification failed
```
**Solution:** Ensure `TAWK_WEBHOOK_SECRET` matches the secret key in your tawk.to webhook configuration.

**2. Agent not found**
```
❌ Meme generator agent not found
```
**Solution:** Verify your agents are properly configured in `src/mastra/index.ts`.

**3. Webhook not receiving events**
- Check that your webhook URL is publicly accessible via HTTPS
- Verify the webhook is properly configured in tawk.to dashboard
- Test with ngrok for local development

### Debug Mode

Enable detailed logging:

```env
NODE_ENV=development
```

This provides verbose logging for debugging webhook events and agent responses.

## 📚 Additional Resources

- [Tawk.to Webhook Documentation](https://developer.tawk.to/webhooks/)
- [Mastra Framework Documentation](https://mastra.ai/docs)
- [Setting up HTTPS with Let's Encrypt](https://letsencrypt.org/)
- [ngrok for Local Testing](https://ngrok.com/)

## 🤝 Integration Examples

### Basic Chat Response

When a visitor sends: "I want to create a funny meme about work"

The system processes this through the meme generator agent and could respond with:
"I'd love to help you create a work meme! Let me guide you through some popular work meme formats..."

### Support Ticket Processing

When a ticket is created with subject "Booking availability":

The availability agent processes the ticket and generates appropriate follow-up actions or responses.

---

## 🎉 Ready to Go!

Your Tawk.to webhook is now configured and ready to provide intelligent chat responses through your Mastra agents! Visitors can now interact with your agents directly through tawk.to's chat interface, with full memory integration and personalized responses.

For any issues or questions, check the troubleshooting section above or review the server logs for detailed error information. 