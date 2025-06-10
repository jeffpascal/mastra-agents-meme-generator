import { Mem0Integration } from '@mastra/mem0';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// ====================================================================
// DUAL STORAGE ARCHITECTURE:
// 1. Mastra System Storage (LibSQL) - Used by index.ts for system operations
// 2. Agent Memory (Mem0) - Used here for intelligent user memory (per chat session)
// ====================================================================

// Global session ID that persists across tool calls within the same agent execution
let currentSessionId: string | null = null;

// Function to create Mem0 integration with dynamic user ID
function createMem0Integration(userId: string): Mem0Integration {
  return new Mem0Integration({
    config: {
      apiKey: process.env.MEM0_API_KEY || '',
      user_id: userId, // Dynamic user identifier per chat session
      app_id: 'mastra-meme-generator',
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

// Enhanced tool for remembering information from previous meme conversations
export const mem0RememberTool = createTool({
  id: 'Mem0-remember',
  description: 'Remember user requests, preferences, and intent from previous meme conversations for this specific chat session. Each chat has separate memory.',
  inputSchema: z.object({
    question: z.string().describe('Question to search for in saved memories. Examples: "user meme preferences and patterns", "most recent meme topic and main subject for this user", "what subjects does the user request memes about"'),
  }),
  outputSchema: z.object({
    answer: z.string().describe('Remembered information about user intent and preferences for this chat session'),
  }),
  execute: async ({ context }) => {
    try {
      const timestamp = new Date().toISOString();
      const userId = getUserId(context);
      
      console.log(`🔍 [${timestamp}] Mem0-remember called by agent`);
      console.log(`   👤 User ID: "${userId}"`);
      console.log(`   📝 Query: "${context.question}"`);
      console.log(`   🧩 Context keys: ${Object.keys(context).join(', ')}`);
      
      // Check if API key is configured
      if (!process.env.MEM0_API_KEY) {
        console.log('⚠️ MEM0_API_KEY not found in environment variables');
        return {
          answer: 'Memory service not configured. Please add MEM0_API_KEY to your environment variables.',
        };
      }
      
      // Create Mem0 integration for this specific user/chat
      const mem0 = createMem0Integration(userId);
      const memory = await mem0.searchMemory(context.question);
      
      console.log(`✅ [${timestamp}] Memory search completed for user ${userId}`);
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
              answer: `Most recent meme was about: ${subject}. Full context: ${memory}`,
            };
          }
        }
      }
      
      // If no memory found, provide helpful context
      if (!memory || memory.trim() === '') {
        console.log(`   ❌ No memories found for user ${userId}`);
        return {
          answer: `No relevant memories found for this chat session (ID: ${userId}). This could mean this is a new conversation or the memory search didn't find matching content.`,
        };
      }
      
      return {
        answer: memory,
      };
    } catch (error) {
      console.error('❌ Error searching memory:', error);
      return {
        answer: `Error retrieving memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Enhanced tool for saving meme-related information and preferences
export const mem0MemorizeTool = createTool({
  id: 'Mem0-memorize',
  description: 'Save user requests and intent for this specific chat session using the USER REQUEST format. Each chat has separate memory space.',
  inputSchema: z.object({
    statement: z.string().describe('User intent and request information to save using the USER REQUEST format. Focus on what the user wanted, not how the system fulfilled it.'),
  }),
  execute: async ({ context }) => {
    try {
      const timestamp = new Date().toISOString();
      const userId = getUserId(context);
      
      console.log(`💾 [${timestamp}] Mem0-memorize called by agent`);
      console.log(`   👤 User ID: "${userId}"`);
      console.log(`   📝 Saving: "${context.statement}"`);
      console.log(`   🧩 Context keys: ${Object.keys(context).join(', ')}`);
      
      // Check if API key is configured
      if (!process.env.MEM0_API_KEY) {
        console.log('⚠️ MEM0_API_KEY not found in environment variables');
        return { 
          success: false, 
          message: 'Memory service not configured. Please add MEM0_API_KEY to your environment variables.' 
        };
      }
      
      // Enhanced logging for USER REQUEST format
      if (context.statement.includes('USER REQUEST:')) {
        console.log(`   👤 Saving user intent data for session ${userId}`);
        
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
        console.log(`✅ [${timestamp}] Memory saved successfully for user ${userId}: "${context.statement}"`);
        return { success: true, message: `Memory saved successfully for session ${userId}` };
      } catch (memoryError) {
        console.error(`❌ [${timestamp}] Error saving memory for user ${userId}:`, memoryError);
        return { 
          success: false, 
          message: `Error saving memory: ${memoryError instanceof Error ? memoryError.message : 'Unknown error'}` 
        };
      }
      
    } catch (error) {
      console.error('❌ Error in memorize tool:', error);
      return { 
        success: false, 
        message: `Error saving memory: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },
});

// Export the tools for use in agents
export const mem0Tools = {
  mem0RememberTool,
  mem0MemorizeTool,
};

// Keep storage export for backward compatibility if needed elsewhere
export const storage = null; // No longer using LibSQL storage
