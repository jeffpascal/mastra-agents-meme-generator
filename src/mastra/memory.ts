import { Mem0Integration } from '@mastra/mem0';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { randomUUID } from 'crypto';
// Add Mastra Memory imports
import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { openai } from '@ai-sdk/openai';

// ====================================================================
// HYBRID MEMORY ARCHITECTURE:
// 1. Mastra Built-in Memory (LibSQL) - Working Memory + Semantic Recall
// 2. Mem0 Agent Memory - Intelligent user memory (per chat session)
// 3. Mastra System Storage (LibSQL) - Used by index.ts for system operations
// ====================================================================

// === MASTRA BUILT-IN MEMORY CONFIGURATION ===
// Configure storage for Mastra memory (separate from system storage)
const memoryStorage = new LibSQLStore({
  url: 'file:./mastra-memory.db', // Separate database for memory
});

// Configure vector database for semantic recall
const memoryVector = new LibSQLVector({
  connectionUrl: 'file:./mastra-memory.db',
});

// Create Mastra Memory instance with enhanced configuration
export const mastraMemory = new Memory({
  storage: memoryStorage,
  vector: memoryVector,
  embedder: openai.embedding('text-embedding-3-small'), // Use OpenAI embeddings
  options: {
    // Enable Working Memory - maintains persistent user information
    workingMemory: {
      enabled: true,
      template: `
# User Profile & Session Context

## Personal Information
- Name:
- Preferences:
- Language: [Detected from conversation]
- Context Type: [Meme Generation, Availability Booking, etc.]

## Current Session State
- Active Request:
- Main Subject/Topic:
- Conversation Flow State:
- Recent Interactions:
  - [Last request summary]
  - [Key decisions made]

## Meme Generation Context
- Preferred Subjects:
- Successful Patterns:
- Language Preferences:
- Recent Meme Topics:

## Availability Context  
- Property Preferences:
- Booking Patterns:
- Guest Requirements:
- Location Preferences:

## User Feedback & Learning
- Positive Responses:
- Areas for Improvement:
- User Satisfaction Indicators:
`,
    },
    // Configure Semantic Recall for long-term context
    semanticRecall: {
      topK: 5, // Retrieve 5 most relevant memories
      messageRange: 2, // Include 2 messages before/after each match
    },
  },
});

// === EXISTING MEM0 MEMORY SYSTEM ===
// Global session ID that persists across tool calls within the same agent execution
let currentSessionId: string | null = null;

// Function to create Mem0 integration with dynamic user ID
function createMem0Integration(userId: string): Mem0Integration {
  return new Mem0Integration({
    config: {
      apiKey: process.env.MEM0_API_KEY || '',
      user_id: userId, // Dynamic user identifier per chat session
      app_id: 'mastra-agents-hybrid-memory',
    },
  });
}

// Function to extract or generate user ID from context
function getUserId(context: any): string {
  // Try to get user ID from various possible sources
  if (context?.threadId) {
    return `chat-${context.threadId}`;
  }
  if (context?.userId) {
    return context.userId;
  }
  if (context?.sessionId) {
    return `session-${context.sessionId}`;
  }
  
  // Try to get from conversation/run context (Mastra specific)
  if (context?.conversationId) {
    return `conv-${context.conversationId}`;
  }
  if (context?.runId) {
    return `run-${context.runId}`;
  }
  
  // Use a persistent session ID for this agent execution
  // This ensures all tool calls within the same conversation use the same ID
  if (!currentSessionId) {
    currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    console.log(`🆔 Generated new persistent session ID: ${currentSessionId}`);
  }
  
  return currentSessionId;
}

// === ENHANCED MEM0 TOOLS WITH HYBRID AWARENESS ===
// Enhanced tool for remembering information from previous conversations
export const mem0RememberTool = createTool({
  id: 'Mem0-remember',
  description: 'Remember specific user requests, patterns, and intent from previous conversations for this chat session. This works alongside Mastra\'s built-in memory for comprehensive recall.',
  inputSchema: z.object({
    question: z.string().describe('Specific question to search for in Mem0 memories. Examples: "user meme preferences and successful patterns", "most recent meme topic and main subject", "what subjects does the user request memes about", "user booking preferences and history"'),
  }),
  outputSchema: z.object({
    answer: z.string().describe('Specific remembered information about user intent and patterns for this chat session'),
  }),
  execute: async ({ context }) => {
    try {
      const timestamp = new Date().toISOString();
      const userId = getUserId(context);
      
      console.log(`🔍 [${timestamp}] Mem0-remember called (hybrid memory system)`);
      console.log(`   👤 User ID: "${userId}"`);
      console.log(`   📝 Query: "${context.question}"`);
      console.log(`   🧩 Context keys: ${Object.keys(context).join(', ')}`);
      
      // Check if API key is configured
      if (!process.env.MEM0_API_KEY) {
        console.log('⚠️ MEM0_API_KEY not found in environment variables');
        return {
          answer: 'Mem0 memory service not configured. Please add MEM0_API_KEY to your environment variables. Note: Mastra\'s built-in memory is still active.',
        };
      }
      
      // Create Mem0 integration for this specific user/chat
      const mem0 = createMem0Integration(userId);
      const memory = await mem0.searchMemory(context.question);
      
      console.log(`✅ [${timestamp}] Mem0 memory search completed for user ${userId}`);
      console.log(`   💭 Raw memory result: "${memory || 'No relevant memories'}"`);
      
      // Enhanced processing for contextual requests
      if (context.question.includes('most recent') || context.question.includes('main subject')) {
        console.log(`   🎯 Processing contextual memory query...`);
        
        // Try to extract specific subject information from memory
        if (memory && memory.includes('Subject:')) {
          const subjectMatch = memory.match(/Subject:\s*([^.]+)/);
          if (subjectMatch) {
            const subject = subjectMatch[1].trim();
            console.log(`   👤 Extracted subject: "${subject}"`);
            return {
              answer: `Most recent topic from Mem0: ${subject}. Full context: ${memory}`,
            };
          }
        }
      }
      
      // If no memory found, provide helpful context about hybrid system
      if (!memory || memory.trim() === '') {
        console.log(`   ❌ No Mem0 memories found for user ${userId}`);
        return {
          answer: `No relevant Mem0 memories found for this chat session (ID: ${userId}). Note: This is the Mem0 memory system - Mastra's built-in memory may have additional context available through conversation history.`,
        };
      }
      
      return {
        answer: memory,
      };
    } catch (error) {
      console.error('❌ Error searching Mem0 memory:', error);
      return {
        answer: `Error retrieving Mem0 memory: ${error instanceof Error ? error.message : 'Unknown error'}. Note: Mastra's built-in memory system is still available.`,
      };
    }
  },
});

// Enhanced tool for saving information with hybrid system awareness
export const mem0MemorizeTool = createTool({
  id: 'Mem0-memorize',
  description: 'Save specific user requests and intent patterns to Mem0 for this chat session. This complements Mastra\'s automatic memory with explicit user pattern storage.',
  inputSchema: z.object({
    statement: z.string().describe('User intent and request information to save using the USER REQUEST format. Focus on specific patterns, preferences, and subjects that should be remembered across sessions.'),
  }),
  execute: async ({ context }) => {
    try {
      const timestamp = new Date().toISOString();
      const userId = getUserId(context);
      
      console.log(`💾 [${timestamp}] Mem0-memorize called (hybrid memory system)`);
      console.log(`   👤 User ID: "${userId}"`);
      console.log(`   📝 Saving: "${context.statement}"`);
      console.log(`   🧩 Context keys: ${Object.keys(context).join(', ')}`);
      
      // Check if API key is configured
      if (!process.env.MEM0_API_KEY) {
        console.log('⚠️ MEM0_API_KEY not found in environment variables');
        return { 
          success: false, 
          message: 'Mem0 memory service not configured. Please add MEM0_API_KEY to your environment variables. Note: Mastra\'s built-in memory will still capture conversation context automatically.' 
        };
      }
      
      // Enhanced logging for USER REQUEST format
      if (context.statement.includes('USER REQUEST:')) {
        console.log(`   👤 Saving user intent pattern for session ${userId}`);
        
        // Extract key components for debugging
        const subjectMatch = context.statement.match(/Subject:\s*([^.]+)/);
        const languageMatch = context.statement.match(/in\s+(\w+)/);
        const contextMatch = context.statement.match(/Context:\s*([^.]+)/);
        
        if (subjectMatch) console.log(`   🎯 Subject: "${subjectMatch[1].trim()}"`);
        if (languageMatch) console.log(`   🌍 Language: "${languageMatch[1].trim()}"`);
        if (contextMatch) console.log(`   📝 Context: "${contextMatch[1].trim()}"`);
      }
      
      // Warning if saving system-generated details
      const systemTerms = ['Generated', 'format', 'Result:', 'https://'];
      const containsSystemDetails = systemTerms.some(term => context.statement.includes(term));
      if (containsSystemDetails) {
        console.log(`   ⚠️ Warning: Statement contains system-generated details - should focus on user intent only`);
      }
      
      // Create Mem0 integration for this specific user/chat
      const mem0 = createMem0Integration(userId);
      
      // Save memories with better error handling
      try {
        await mem0.createMemory(context.statement);
        console.log(`✅ [${timestamp}] Mem0 memory saved successfully for user ${userId}: "${context.statement}"`);
        return { success: true, message: `Mem0 memory saved successfully for session ${userId}` };
      } catch (memoryError) {
        console.error(`❌ [${timestamp}] Error saving Mem0 memory for user ${userId}:`, memoryError);
        return { 
          success: false, 
          message: `Error saving to Mem0: ${memoryError instanceof Error ? memoryError.message : 'Unknown error'}` 
        };
      }
      
    } catch (error) {
      console.error('❌ Error in Mem0 memorize tool:', error);
      return { 
        success: false, 
        message: `Error saving Mem0 memory: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },
});

// === EXPORT HYBRID MEMORY TOOLS ===
// Export both Mem0 tools for backward compatibility
export const mem0Tools = {
  mem0RememberTool,
  mem0MemorizeTool,
};

// === HYBRID MEMORY SYSTEM EXPORTS ===
// Export the complete hybrid memory configuration
export const hybridMemoryConfig = {
  // Mastra's built-in memory for automatic conversation tracking
  mastraMemory,
  // Mem0 tools for explicit user pattern management  
  mem0Tools,
};

// Export Mastra memory for direct agent integration
export { mastraMemory as memory };

// Keep storage export for backward compatibility if needed elsewhere
export const storage = null; // No longer using separate LibSQL storage here
