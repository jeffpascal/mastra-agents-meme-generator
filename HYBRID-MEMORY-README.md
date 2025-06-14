# Enhanced Hybrid Memory System for Mastra Agents

This project includes a **state-of-the-art hybrid memory architecture** that combines Mastra's built-in memory capabilities with Mem0's intelligent agent memory for unprecedented personalization and context awareness.

## 🧠 Memory Architecture Overview

Our hybrid system provides **three complementary memory layers**:

### 1. **Mastra System Storage** (LibSQL)
- **Purpose**: Core system operations, telemetry, workflow state
- **Location**: 
  - Local development: `./mastra-system.db`
  - Docker: `/data/mastra-ai/mastra-system.db`
- **Configuration**: Used in `src/mastra/index.ts` for main Mastra instance
- **Automatic**: Handles system-level persistence transparently

### 2. **Mastra Built-in Memory** (LibSQL + Vector)
- **Purpose**: Automatic conversation tracking, semantic recall, working memory
- **Location**: 
  - Local development: `./mastra-memory.db`
  - Docker: `/data/mastra-ai/mastra-memory.db`
- **Features**: 
  - Working Memory with user profile templates
  - Semantic Recall using AI embeddings  
  - Automatic context preservation
  - Cross-conversation learning

### 3. **Mem0 Agent Memory** (Cloud/API)
- **Purpose**: Explicit user pattern storage, cross-session intelligence
- **Features**:
  - User-specific memory per chat session
  - Intelligent pattern recognition
  - Explicit memory save/recall tools
  - Advanced personalization

## 🏗️ Configuration Examples

### Mastra Built-in Memory Setup

```typescript
// Environment-aware database path
const getMemoryDbPath = () => {
  // Use Docker path if in container, relative path for local development
  const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV === 'true';
  return isDocker ? 'file:/data/mastra-ai/mastra-memory.db' : 'file:./mastra-memory.db';
};

// Configure storage for Mastra memory (separate from system storage)
const memoryStorage = new LibSQLStore({
  url: getMemoryDbPath(), // Environment-aware database path
});

// Configure vector database for semantic recall
const memoryVector = new LibSQLVector({
  connectionUrl: getMemoryDbPath(),
});

export const mastraMemory = new Memory({
  storage: memoryStorage,
  vector: memoryVector,
  embedder: openai.embedding('text-embedding-3-small'),
  options: {
    workingMemory: {
      enabled: true,
      template: `# User Profile & Session Context...`
    },
    semanticRecall: {
      topK: 5,
      messageRange: 2,
    },
  },
});

// Mem0 Memory Tools
export const mem0Tools = {
  mem0RememberTool,  // Explicit pattern retrieval
  mem0MemorizeTool,  // Explicit pattern storage
};
```

## 🎯 Key Benefits

### Automatic + Explicit Memory
- **Mastra Memory**: Works automatically without tool calls
- **Mem0 Memory**: Controlled explicitly through tools
- **Together**: Comprehensive memory coverage

### Enhanced Personalization
- Automatic user behavior learning
- Explicit preference storage
- Context preservation across sessions
- Intelligent pattern recognition

### Scalable Performance
- Local storage for frequent access
- API-based storage for intelligent patterns
- Efficient memory retrieval
- Separate databases prevent conflicts

## 🚀 Implementation Details

### Memory Configuration (`src/mastra/memory.ts`)

```typescript
// Mastra Built-in Memory
export const mastraMemory = new Memory({
  storage: new LibSQLStore({ url: getMemoryDbPath() }),
  vector: new LibSQLVector({ connectionUrl: getMemoryDbPath() }),
  embedder: openai.embedding('text-embedding-3-small'),
  options: {
    workingMemory: {
      enabled: true,
      template: `# User Profile & Session Context...`
    },
    semanticRecall: {
      topK: 5,
      messageRange: 2,
    },
  },
});

// Mem0 Memory Tools
export const mem0Tools = {
  mem0RememberTool,  // Explicit pattern retrieval
  mem0MemorizeTool,  // Explicit pattern storage
};
```

### Agent Integration

Both agents now include:

```typescript
export const memeGeneratorAgent = new Agent({
  name: 'MemeGenerator',
  instructions: `...hybrid memory instructions...`,
  model: openai('gpt-4o-mini'),
  memory: mastraMemory,     // Automatic memory
  tools: mem0Tools,         // Explicit memory tools
  workflows: { 'meme-generation': memeGenerationWorkflow },
});
```

## 🔧 How Memory Systems Work Together

### Meme Generator Agent

#### Automatic Memory (Mastra)
- Tracks conversation flow automatically
- Learns user preferences and patterns
- Provides semantic recall of relevant context
- Updates working memory template with user info

#### Explicit Memory (Mem0)
- Saves specific user requests: `"USER REQUEST: User requested meme about Jeff in Romanian"`
- Retrieves patterns: `"most recent meme topic and main subject"`
- Stores feedback and successful patterns
- Maintains session-specific context

### Availability Agent

#### Automatic Memory (Mastra)
- Tracks booking conversation flow
- Learns property and date preferences
- Provides context for booking decisions
- Maintains user profile across bookings

#### Explicit Memory (Mem0)
- Stores conversation state: `"conversation_state": "awaiting_checkin"`
- Saves booking preferences: `"user_preferences": "Casa Pescarului, 2 guests"`
- Retrieves booking patterns and history
- Maintains booking workflow state

## 📊 Working Memory Templates

### User Profile Template
```markdown
# User Profile & Session Context

## Personal Information
- Name: [Auto-filled from conversation]
- Preferences: [Learned patterns]
- Language: [Detected from conversation]
- Context Type: [Meme Generation, Availability Booking, etc.]

## Current Session State
- Active Request: [Current user goal]
- Main Subject/Topic: [What they're working on]
- Conversation Flow State: [Where we are in the process]
- Recent Interactions: [Key decisions made]

## Meme Generation Context
- Preferred Subjects: [People, topics they mention]
- Successful Patterns: [What worked well]
- Language Preferences: [Preferred output language]
- Recent Meme Topics: [Recent subjects]

## Availability Context  
- Property Preferences: [Liked properties]
- Booking Patterns: [Typical requirements]
- Guest Requirements: [Number of guests, special needs]
- Location Preferences: [Preferred areas]

## User Feedback & Learning
- Positive Responses: [What they liked]
- Areas for Improvement: [What needs work]
- User Satisfaction Indicators: [Success metrics]
```

## 🧪 Testing the System

Run the comprehensive test:

```bash
node test-hybrid-memory.js
```

This test verifies:
- ✅ Both agents have hybrid memory configured
- ✅ Mastra memory works automatically
- ✅ Mem0 tools function correctly
- ✅ Memory systems work together seamlessly
- ✅ Working memory template effectiveness
- ✅ Cross-session context preservation

## 🔑 Environment Setup

Required environment variables:

```env
# OpenAI for embeddings and LLM
OPENAI_API_KEY=your_openai_api_key

# Mem0 for explicit memory patterns
MEM0_API_KEY=your_mem0_api_key
```

## 📁 Database Files

The system creates several database files:

- `mastra-system.db` - Core system storage
- `mastra-memory.db` - Mastra memory storage & vectors
- No additional files for Mem0 (uses external API)

## 🎭 Usage Examples

### Meme Generator with Hybrid Memory

```javascript
// First interaction - both systems learn automatically
const response1 = await memeGeneratorAgent.text(
  "fa un meme despre Jeff",
  { threadId: "user123" }
);
// Mastra: Automatically tracks conversation
// Mem0: Saves "USER REQUEST: User requested meme about Jeff in Romanian"

// Contextual follow-up - both systems provide context
const response2 = await memeGeneratorAgent.text(
  "mai fa unul",
  { threadId: "user123" }
);
// Mastra: Provides automatic conversation context
// Mem0: Retrieves "Jeff" as the main subject
// Result: Creates another meme about Jeff
```

### Availability Agent with Hybrid Memory

```javascript
// Booking inquiry - both systems track preferences
const response1 = await availabilityAgent.text(
  "Vreau să rezerv Casa Pescarului pentru 2 persoane",
  { threadId: "booking456" }
);
// Mastra: Learns booking patterns automatically  
// Mem0: Saves conversation_state and preferences

// Follow-up - both systems maintain context
const response2 = await availabilityAgent.text(
  "ce date sunt libere în iulie?",
  { threadId: "booking456" }
);
// Mastra: Knows this continues the booking conversation
// Mem0: Retrieves Casa Pescarului + 2 guests context
// Result: Searches availability for Casa Pescarului, 2 guests, July dates
```

## 🚀 Advanced Features

### Semantic Recall
- Finds relevant past conversations using AI embeddings
- Retrieves up to 5 most similar messages
- Includes 2 messages before/after each match for context
- Works across all conversations for better personalization

### Working Memory Evolution
- Automatically updates user profile over time
- Learns preferences without explicit programming
- Maintains session context across interactions
- Provides persistent personalization

### Intelligent Tool Usage
- Mem0 tools automatically called by agents when needed
- No manual intervention required
- Graceful fallback if one memory system fails
- Seamless integration with existing workflows

## 🔧 Troubleshooting

### Memory Not Working?
1. Check environment variables are set
2. Verify API keys are valid
3. Ensure database files are writable
4. Check network connectivity for Mem0

### Performance Issues?
1. Monitor database file sizes
2. Check embedding API usage
3. Verify memory retrieval speeds
4. Consider adjusting `topK` values

### Integration Problems?
1. Verify agent configurations include `memory` property
2. Check that tools are properly imported
3. Ensure working memory template is valid
4. Test individual memory systems separately

## 🔮 Future Enhancements

### Planned Improvements
- Memory analytics and insights
- Custom memory processors
- Advanced semantic search
- Memory compression strategies
- Cross-agent memory sharing
- Memory performance optimization

### Customization Options
- Adjustable working memory templates
- Configurable semantic recall parameters
- Custom embedding models
- Memory retention policies
- User privacy controls

## 📈 Benefits Summary

### For Users
- ✨ Personalized experiences that improve over time
- 🧠 Agents remember preferences and context
- 🔄 Seamless conversation continuity
- 🎯 More accurate and relevant responses

### For Developers  
- 🏗️ Robust memory architecture
- 🔧 Easy to configure and customize
- 📊 Comprehensive memory coverage
- 🚀 Scalable and performant
- 🛡️ Graceful error handling

---

**🎉 Congratulations!** You now have a state-of-the-art hybrid memory system that combines the best of automatic conversation tracking with explicit pattern storage. Your agents will provide increasingly personalized and contextual experiences as they learn from each interaction. 