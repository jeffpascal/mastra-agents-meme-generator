// Simple test to verify session memory persistence
import { mem0MemorizeTool, mem0RememberTool } from './src/mastra/memory.js';

async function testSessionMemoryPersistence() {
  console.log('🧪 Testing Session Memory Persistence Fix...\n');
  
  if (!process.env.MEM0_API_KEY) {
    console.log('⚠️ Please set MEM0_API_KEY in your .env file');
    return;
  }
  
  try {
    // Simulate the exact user flow that was failing
    console.log('🎬 Simulating user conversation...\n');
    
    // STEP 1: User asks to make a meme about Jeff
    console.log('1️⃣ User: "fa un meme despre jeff"');
    console.log('   💾 Agent saves memory about Jeff...');
    
    const saveResult = await mem0MemorizeTool.execute({
      context: { 
        statement: 'USER REQUEST: User requested meme about Jeff in Romanian. Subject: Jeff. Context: Personal meme about specific person named Jeff' 
      }
    });
    console.log('   ✅ Save result:', saveResult);
    console.log('');
    
    // Wait a moment for memory to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // STEP 2: User asks who the meme was about
    console.log('2️⃣ User: "despre cine a fost memeul trecut?" (who was the previous meme about?)');
    console.log('   🔍 Agent searches memory...');
    
    const rememberResult = await mem0RememberTool.execute({
      context: { 
        question: 'previous meme subject and person mentioned' 
      }
    });
    console.log('   📝 Memory result:', rememberResult);
    console.log('');
    
    // STEP 3: User asks if there's anything in memory
    console.log('3️⃣ User: "ai ceva în memorie?" (do you have anything in memory?)');
    console.log('   🔍 Agent searches memory...');
    
    const rememberResult2 = await mem0RememberTool.execute({
      context: { 
        question: 'user preferences and conversation history' 
      }
    });
    console.log('   📝 Memory result:', rememberResult2);
    console.log('');
    
    // Check if memory is working
    const foundJeff = rememberResult.answer.includes('Jeff') || rememberResult2.answer.includes('Jeff');
    const hasMemory = !rememberResult.answer.includes('No relevant memories') && !rememberResult2.answer.includes('No relevant memories');
    
    if (foundJeff && hasMemory) {
      console.log('✅ SUCCESS: Memory persistence is working!');
      console.log('🎯 The agent can now remember Jeff across tool calls in the same session.');
    } else {
      console.log('❌ PROBLEM: Memory is still not persisting properly');
      console.log('🔍 Debug info:');
      console.log('   - Found Jeff:', foundJeff);
      console.log('   - Has memory:', hasMemory);
    }
    
  } catch (error) {
    console.error('❌ Error testing session memory persistence:', error);
  }
}

// Run the test
console.log('🚀 Starting Session Memory Persistence Test...\n');
await testSessionMemoryPersistence();
console.log('\n�� Test completed!'); 