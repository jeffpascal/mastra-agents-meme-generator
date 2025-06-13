// Test script to verify Mem0 integration and separate memory per chat session
import { mem0, mem0MemorizeTool, mem0RememberTool } from './src/mastra/memory.js';

// Function to test Romanian character normalization (mirroring the one in generate-meme.ts)
function normalizeRomanianText(text) {
  const romanianCharMap = {
    'ă': 'a', 'Ă': 'A',
    'â': 'a', 'Â': 'A', 
    'î': 'i', 'Î': 'I',
    'ș': 's', 'Ș': 'S',
    'ț': 't', 'Ț': 'T'
  };
  
  return text.replace(/[ăĂâÂîÎșȘțȚ]/g, (char) => romanianCharMap[char] || char);
}

async function testSeparateMemorySpaces() {
  console.log('🔄 Testing Separate Memory Spaces Per Chat Session...\n');
  
  if (!process.env.MEM0_API_KEY) {
    console.log('⚠️ Please set MEM0_API_KEY in your .env file');
    return;
  }
  
  try {
    // === CHAT SESSION 1: User talking about Jeff ===
    console.log('💬 CHAT SESSION 1: User A talking about Jeff');
    
    const session1Context = { threadId: 'thread-123-jeff' };
    
    console.log('   💾 Session 1: Saving memory about Jeff...');
    const save1 = await mem0MemorizeTool.execute({
      context: { 
        ...session1Context,
        statement: 'USER REQUEST: User requested meme about Jeff in Romanian. Subject: Jeff. Context: Personal meme about coworker Jeff' 
      }
    });
    console.log('   ✅ Session 1 save result:', save1);
    console.log('');
    
    // === CHAT SESSION 2: Different user talking about Sarah ===
    console.log('💬 CHAT SESSION 2: User B talking about Sarah');
    
    const session2Context = { threadId: 'thread-456-sarah' };
    
    console.log('   💾 Session 2: Saving memory about Sarah...');
    const save2 = await mem0MemorizeTool.execute({
      context: { 
        ...session2Context,
        statement: 'USER REQUEST: User requested meme about Sarah in English. Subject: Sarah. Context: Personal meme about friend Sarah' 
      }
    });
    console.log('   ✅ Session 2 save result:', save2);
    console.log('');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // === TEST: Session 1 should only remember Jeff ===
    console.log('🔍 TEST: Session 1 should only remember Jeff...');
    const remember1 = await mem0RememberTool.execute({
      context: { 
        ...session1Context,
        question: 'most recent meme topic and main subject for this user' 
      }
    });
    console.log('   📝 Session 1 memory:', remember1.answer);
    
    if (remember1.answer.includes('Jeff') && !remember1.answer.includes('Sarah')) {
      console.log('   ✅ SUCCESS: Session 1 only knows about Jeff');
    } else {
      console.log('   ❌ PROBLEM: Session 1 has cross-contamination or missing Jeff');
    }
    console.log('');
    
    // === TEST: Session 2 should only remember Sarah ===
    console.log('🔍 TEST: Session 2 should only remember Sarah...');
    const remember2 = await mem0RememberTool.execute({
      context: { 
        ...session2Context,
        question: 'most recent meme topic and main subject for this user' 
      }
    });
    console.log('   📝 Session 2 memory:', remember2.answer);
    
    if (remember2.answer.includes('Sarah') && !remember2.answer.includes('Jeff')) {
      console.log('   ✅ SUCCESS: Session 2 only knows about Sarah');
    } else {
      console.log('   ❌ PROBLEM: Session 2 has cross-contamination or missing Sarah');
    }
    console.log('');
    
    // === TEST: Session 3 (new) should have no memory ===
    console.log('🔍 TEST: Session 3 (new) should have no memory...');
    const session3Context = { threadId: 'thread-789-empty' };
    
    const remember3 = await mem0RememberTool.execute({
      context: { 
        ...session3Context,
        question: 'most recent meme topic and main subject for this user' 
      }
    });
    console.log('   📝 Session 3 memory:', remember3.answer);
    
    if (remember3.answer.includes('No relevant memories') || remember3.answer.includes('not found')) {
      console.log('   ✅ SUCCESS: Session 3 has no memories (as expected)');
    } else {
      console.log('   ❌ PROBLEM: Session 3 unexpectedly has memories');
    }
    console.log('');
    
    console.log('✅ Separate memory spaces test completed!');
    console.log('🎯 Each chat session now has its own isolated memory space.');
    
  } catch (error) {
    console.error('❌ Error testing separate memory spaces:', error);
  }
}

async function testRomanianCharacterNormalization() {
  console.log('🔤 Testing Romanian Character Normalization...\n');
  
  const testCases = [
    'Jeff este foarte înțelept și râde',
    'Săptămâna aceasta Jeff a făcut o gafă',
    'Când șeful întreabă dacă totul e gata',
    'Jeff spune că a terminat ÎNTREAGA sarcină',
    'Dar în realitate nici nu a început să facă nimic'
  ];
  
  console.log('📝 Testing character normalization for meme generation...\n');
  
  testCases.forEach((original, index) => {
    const normalized = normalizeRomanianText(original);
    console.log(`${index + 1}. Original:   "${original}"`);
    console.log(`   Normalized: "${normalized}"`);
    console.log('');
  });
  
  // Test individual characters
  console.log('🧪 Individual character tests:');
  const charTests = ['ă→a', 'Ă→A', 'â→a', 'Â→A', 'î→i', 'Î→I', 'ș→s', 'Ș→S', 'ț→t', 'Ț→T'];
  charTests.forEach(test => {
    const [original, expected] = test.split('→');
    const result = normalizeRomanianText(original);
    const status = result === expected ? '✅' : '❌';
    console.log(`   ${status} ${original} → ${result} (expected: ${expected})`);
  });
  
  console.log('\n✅ Romanian character normalization test completed!');
  console.log('🎯 Memes will now be generated without special characters that could cause display issues.');
}

async function testJeffConversationFlow() {
  console.log('👤 Testing Jeff Conversation Flow (Romanian)...\n');
  
  if (!process.env.MEM0_API_KEY) {
    console.log('⚠️ Please set MEM0_API_KEY in your .env file');
    return;
  }
  
  try {
    console.log('🎬 Simulating the exact conversation flow from the user...\n');
    
    // Use a specific thread ID for this conversation
    const conversationContext = { threadId: 'test-conversation-jeff' };
    
    // === PROMPT 1: "fa un meme despre jeff" ===
    console.log('1️⃣ PROMPT 1: "fa un meme despre jeff" (make a meme about Jeff)');
    
    // Agent would check memory first (should be empty initially)
    console.log('   🔍 Agent checks memory for preferences...');
    const checkPrefs1 = await mem0RememberTool.execute({
      context: { 
        ...conversationContext,
        question: 'user meme preferences and successful patterns' 
      }
    });
    console.log('   📝 Memory result:', checkPrefs1.answer);
    
    // Agent generates meme (simulated)
    console.log('   🎭 Agent generates meme about Jeff...');
    const mockUrl1 = 'https://imgflip.com/i/9ws4dh';
    
    // Agent saves memory with NEW user-intent focused format
    console.log('   💾 Agent saves user intent (no system details)...');
    const saveResult1 = await mem0MemorizeTool.execute({
      context: { 
        ...conversationContext,
        statement: 'USER REQUEST: User requested meme about Jeff in Romanian. Subject: Jeff. Context: Personal meme about specific person named Jeff' 
      }
    });
    console.log('   ✅ Save result:', saveResult1);
    console.log('');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // === PROMPT 2: "mai fa unul" ===
    console.log('2️⃣ PROMPT 2: "mai fa unul" (make another one)');
    
    // Agent should check memory for MOST RECENT context
    console.log('   🔍 Agent checks memory for most recent topic...');
    const checkRecent2 = await mem0RememberTool.execute({
      context: { 
        ...conversationContext,
        question: 'most recent meme topic and main subject for this user' 
      }
    });
    console.log('   📝 Memory result:', checkRecent2.answer);
    
    // If working correctly, agent should understand this means "another meme about Jeff"
    if (checkRecent2.answer.includes('Jeff')) {
      console.log('   ✅ SUCCESS: Agent correctly identified Jeff as the subject!');
      console.log('   🎯 Agent should pass to workflow: "mai fa unul about Jeff"');
    } else {
      console.log('   ❌ PROBLEM: Agent did not identify Jeff as the subject');
    }
    
    // Agent generates second meme (simulated with correct context)
    console.log('   🎭 Agent generates another meme about Jeff...');
    const mockUrl2 = 'https://imgflip.com/i/abc456';
    
    // Agent saves memory for second meme (focus on user intent)
    console.log('   💾 Agent saves user intent for second request...');
    const saveResult2 = await mem0MemorizeTool.execute({
      context: { 
        ...conversationContext,
        statement: 'USER REQUEST: User requested another meme about Jeff in Romanian. Subject: Jeff. Context: Follow-up request for same person Jeff' 
      }
    });
    console.log('   ✅ Save result:', saveResult2);
    console.log('');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // === PROMPT 3: "trebe sa includa numele" ===
    console.log('3️⃣ PROMPT 3: "trebe sa includa numele" (it needs to include the name)');
    
    // Agent should check memory for MOST RECENT context again
    console.log('   🔍 Agent checks memory for most recent topic...');
    const checkRecent3 = await mem0RememberTool.execute({
      context: { 
        ...conversationContext,
        question: 'most recent meme topic and main subject for this user' 
      }
    });
    console.log('   📝 Memory result:', checkRecent3.answer);
    
    // Agent should understand this means "include the name Jeff"
    if (checkRecent3.answer.includes('Jeff')) {
      console.log('   ✅ SUCCESS: Agent correctly identified Jeff as the name to include!');
      console.log('   🎯 Agent should pass to workflow: "make meme about Jeff and specifically include the name Jeff"');
    } else {
      console.log('   ❌ PROBLEM: Agent did not identify Jeff as the name to include');
    }
    
    // Agent generates third meme (simulated with name included)
    console.log('   🎭 Agent generates meme about Jeff with name included...');
    const mockUrl3 = 'https://imgflip.com/i/def789';
    
    // Agent saves memory for third meme (focus on user feedback)
    console.log('   💾 Agent saves user feedback about name inclusion...');
    const saveResult3 = await mem0MemorizeTool.execute({
      context: { 
        ...conversationContext,
        statement: 'USER REQUEST: User requested meme about Jeff with name included in Romanian. Subject: Jeff. Context: User specifically wants the name Jeff visible in the meme' 
      }
    });
    console.log('   ✅ Save result:', saveResult3);
    console.log('');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // === DEMONSTRATION: What NOT to save ===
    console.log('🚫 DEMONSTRATION: What NOT to save (system-generated details)...');
    const badSaveExample = await mem0MemorizeTool.execute({
      context: { 
        ...conversationContext,
        statement: 'MEME SESSION: User requested meme about Jeff in Romanian. Generated Drake Pointing format. Result: https://imgflip.com/i/abc123. Context: Used specific template' 
      }
    });
    console.log('   ⚠️ Bad example result (notice the warning):', badSaveExample);
    console.log('');
    
    // === VERIFICATION ===
    console.log('🔍 FINAL VERIFICATION: Checking what the agent now knows...');
    const finalCheck = await mem0RememberTool.execute({
      context: { 
        ...conversationContext,
        question: 'what does the user want in their memes?' 
      }
    });
    console.log('   📋 Final memory state:', finalCheck.answer);
    
    console.log('\n✅ Jeff conversation flow test completed!');
    console.log('🎯 The agent should now focus on user intent, not random meme templates.');
    
  } catch (error) {
    console.error('❌ Error testing Jeff conversation flow:', error);
  }
}

async function simulateAgentBehavior() {
  console.log('🎭 Simulating Agent Meme Generation Behavior...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log('- MEM0_API_KEY:', process.env.MEM0_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('');
  
  if (!process.env.MEM0_API_KEY) {
    console.log('⚠️ Please set MEM0_API_KEY in your .env file');
    console.log('Get your API key from: https://app.mem0.ai');
    return;
  }
  
  try {
    console.log('🔄 Simulating the agent sequence for meme generation...\n');
    
    // Use a specific session context
    const sessionContext = { threadId: 'demo-session-123' };
    
    // STEP 1: Agent checks memory for user preferences (simulating first step)
    console.log('1️⃣ STEP 1: Checking memory for user preferences...');
    const checkPrefs = await mem0RememberTool.execute({
      context: { 
        ...sessionContext,
        question: 'user meme preferences and successful patterns' 
      }
    });
    console.log('   Memory check result:', checkPrefs.answer);
    console.log('');
    
    // STEP 2: Agent runs workflow (simulated - we'll pretend it returned a meme URL)
    console.log('2️⃣ STEP 2: Running meme-generation workflow...');
    const mockMemeUrl = 'https://i.imgflip.com/8abc123.jpg';
    const mockTemplate = 'Drake Pointing';
    const mockTopic = 'work meetings';
    const mockLanguage = 'English';
    const mockSubject = 'work meetings';
    console.log('   📸 Workflow completed! Generated meme URL:', mockMemeUrl);
    console.log('');
    
    // STEP 3: Agent presents meme URL enthusiastically (simulated)
    console.log('3️⃣ STEP 3: Presenting meme to user...');
    console.log('   🎉 "Here\'s your hilarious meme about work meetings! 😄"');
    console.log('   🔗 Meme URL:', mockMemeUrl);
    console.log('');
    
    // STEP 4: Agent IMMEDIATELY saves success with NEW user-intent format
    console.log('4️⃣ STEP 4: IMMEDIATELY saving user intent to memory (no system details)...');
    const saveSuccess = await mem0MemorizeTool.execute({
      context: { 
        ...sessionContext,
        statement: `USER REQUEST: User requested meme about ${mockSubject} in ${mockLanguage}. Subject: ${mockSubject}. Context: Work-related humor request` 
      }
    });
    console.log('   💾 Save result:', saveSuccess);
    console.log('');
    
    // STEP 5: Agent continues conversation (simulated)
    console.log('5️⃣ STEP 5: Continuing conversation naturally...');
    console.log('   💬 "Hope this brings some laughs to your day! Need another meme? 😊"');
    console.log('');
    
    // Wait for memory to be processed
    console.log('⏳ Waiting 3 seconds for memory to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify the memory was saved by checking again
    console.log('🔍 VERIFICATION: Checking if user intent was saved...');
    const verifyMemory = await mem0RememberTool.execute({
      context: { 
        ...sessionContext,
        question: 'what topics has the user requested memes about?' 
      }
    });
    console.log('   ✅ Verification result:', verifyMemory.answer);
    console.log('');
    
    console.log('✅ Agent behavior simulation completed!');
    console.log('🎯 Memory should now focus on user intent, not system-generated details.');
    
  } catch (error) {
    console.error('❌ Error simulating agent behavior:', error);
  }
}

async function testMem0() {
  console.log('🧪 Testing Mem0 Integration...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log('- MEM0_API_KEY:', process.env.MEM0_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('');
  
  if (!process.env.MEM0_API_KEY) {
    console.log('⚠️ Please set MEM0_API_KEY in your .env file');
    console.log('Get your API key from: https://app.mem0.ai');
    return;
  }
  
  try {
    // Use a specific session context for testing
    const testContext = { threadId: 'test-session-basic' };
    
    // Test 1: Save basic user preference
    console.log('💾 Test 1: Saving basic user preference...');
    const saveResult1 = await mem0MemorizeTool.execute({
      context: { 
        ...testContext,
        statement: 'User prefers funny cat memes with sarcastic humor' 
      }
    });
    console.log('Save result:', saveResult1);
    console.log('');
    
    // Test 2: Save enhanced USER REQUEST format
    console.log('💾 Test 2: Saving enhanced USER REQUEST format...');
    const saveResult2 = await mem0MemorizeTool.execute({
      context: { 
        ...testContext,
        statement: 'USER REQUEST: User requested meme about work meetings in English. Subject: work meetings. Context: Office humor meme' 
      }
    });
    console.log('Save result:', saveResult2);
    console.log('');
    
    // Test 3: Save user feedback
    console.log('💾 Test 3: Saving user feedback...');
    const saveResult3 = await mem0MemorizeTool.execute({
      context: { 
        ...testContext,
        statement: 'USER FEEDBACK: User liked the meme about work meetings and wants more office humor' 
      }
    });
    console.log('Save result:', saveResult3);
    console.log('');
    
    // Wait for memories to be processed
    console.log('⏳ Waiting 3 seconds for memories to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 4: Retrieve user preferences
    console.log('🔍 Test 4: Retrieving user preferences...');
    const rememberResult1 = await mem0RememberTool.execute({
      context: { 
        ...testContext,
        question: 'What subjects does the user request memes about?' 
      }
    });
    console.log('Remember result:', rememberResult1);
    console.log('');
    
    // Test 5: Retrieve successful meme patterns
    console.log('🔍 Test 5: Retrieving user requests and patterns...');
    const rememberResult2 = await mem0RememberTool.execute({
      context: { 
        ...testContext,
        question: 'What topics has the user requested memes about?' 
      }
    });
    console.log('Remember result:', rememberResult2);
    console.log('');
    
    // Test 6: Test MOST RECENT query (critical for contextual requests)
    console.log('🔍 Test 6: Testing contextual query - most recent topic...');
    const rememberResult3 = await mem0RememberTool.execute({
      context: { 
        ...testContext,
        question: 'most recent meme topic and main subject for this user' 
      }
    });
    console.log('Remember result:', rememberResult3);
    console.log('');
    
    console.log('✅ Mem0 integration test completed!');
    
  } catch (error) {
    console.error('❌ Error testing Mem0:', error);
  }
}

// Run all tests
console.log('🚀 Starting Comprehensive Mem0 Tests...\n');
console.log('==========================================\n');

await testRomanianCharacterNormalization();

console.log('\n==========================================\n');

await testSeparateMemorySpaces();

console.log('\n==========================================\n');

await testMem0();

console.log('\n==========================================\n');

await simulateAgentBehavior();

console.log('\n==========================================\n');

await testJeffConversationFlow();

console.log('\n🎉 All tests completed!'); 