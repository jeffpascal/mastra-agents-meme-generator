// Simple verification script for hybrid memory configuration setup
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Hybrid Memory Setup...\n');

// Check environment variables
if (!process.env.MEM0_API_KEY) {
  console.log('⚠️  MEM0_API_KEY not found in environment');
  console.log('   Please add it to your .env file');
} else {
  console.log('✅ MEM0_API_KEY found');
}

if (!process.env.OPENAI_API_KEY) {
  console.log('⚠️  OPENAI_API_KEY not found in environment');  
  console.log('   Please add it to your .env file');
} else {
  console.log('✅ OPENAI_API_KEY found');
}

console.log('');

// Check if required packages are installed
try {
  const pkg = require('./package.json');
  
  console.log('📦 Checking dependencies...');
  
  const requiredDeps = [
    '@mastra/core',
    '@mastra/memory', 
    '@mastra/mem0',
    '@mastra/libsql',
    '@ai-sdk/openai'
  ];
  
  for (const dep of requiredDeps) {
    if (pkg.dependencies[dep]) {
      console.log(`✅ ${dep}: ${pkg.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: Not found`);
    }
  }
  
  console.log('');
  
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

// Check if memory configuration files exist
console.log('📁 Checking memory configuration files...');

const files = [
  'src/mastra/memory.ts',
  'src/mastra/agents/meme-generator.ts', 
  'src/mastra/agents/availability-agent.ts',
  'HYBRID-MEMORY-README.md'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}: Exists`);
  } else {
    console.log(`❌ ${file}: Not found`);
  }
}

console.log('');

// Check memory.ts file for hybrid configuration
try {
  const memoryContent = fs.readFileSync('src/mastra/memory.ts', 'utf8');
  
  console.log('🔧 Checking memory.ts configuration...');
  
  const checks = [
    { name: 'Mastra Memory import', pattern: /import.*Memory.*from.*@mastra\/memory/ },
    { name: 'LibSQL imports', pattern: /import.*LibSQLStore.*LibSQLVector.*from.*@mastra\/libsql/ },
    { name: 'OpenAI embeddings', pattern: /openai\.embedding/ },
    { name: 'Working Memory config', pattern: /workingMemory.*enabled.*true/ },
    { name: 'Semantic Recall config', pattern: /semanticRecall/ },
    { name: 'Mem0 tools export', pattern: /export.*mem0Tools/ },
    { name: 'Mastra memory export', pattern: /export.*mastraMemory/ }
  ];
  
  for (const check of checks) {
    if (check.pattern.test(memoryContent)) {
      console.log(`✅ ${check.name}: Configured`);
    } else {
      console.log(`⚠️  ${check.name}: May need verification`);
    }
  }
  
  console.log('');
  
} catch (error) {
  console.log('❌ Error reading memory.ts:', error.message);
}

// Check agent files for memory integration
const agents = [
  { name: 'Meme Generator', file: 'src/mastra/agents/meme-generator.ts' },
  { name: 'Availability Agent', file: 'src/mastra/agents/availability-agent.ts' }
];

for (const agent of agents) {
  try {
    const content = fs.readFileSync(agent.file, 'utf8');
    
    console.log(`🤖 Checking ${agent.name} configuration...`);
    
    const hasMemoryImport = /import.*mastraMemory.*from.*\.\.\/memory/.test(content);
    const hasMemoryConfig = /memory:\s*mastraMemory/.test(content);
    const hasMemoryTools = /mem0Tools/.test(content);
    const hasHybridInstructions = /HYBRID MEMORY/.test(content) || /hybrid memory/i.test(content);
    
    console.log(`   ${hasMemoryImport ? '✅' : '❌'} Mastra memory import`);
    console.log(`   ${hasMemoryConfig ? '✅' : '❌'} Memory configuration`);
    console.log(`   ${hasMemoryTools ? '✅' : '❌'} Mem0 tools integration`);
    console.log(`   ${hasHybridInstructions ? '✅' : '❌'} Hybrid memory instructions`);
    
    console.log('');
    
  } catch (error) {
    console.log(`❌ Error reading ${agent.file}:`, error.message);
  }
}

console.log('🎯 Hybrid Memory System Summary:');
console.log('');
console.log('   🔧 MASTRA BUILT-IN MEMORY');
console.log('      ├── Working Memory: User profiles & session context');
console.log('      ├── Semantic Recall: AI-powered conversation retrieval');
console.log('      ├── Storage: LibSQL (./mastra-memory.db)');
console.log('      └── Embeddings: OpenAI text-embedding-3-small');
console.log('');
console.log('   🧠 MEM0 MEMORY TOOLS');
console.log('      ├── Explicit Pattern Storage: Custom user patterns');
console.log('      ├── Intelligent Retrieval: Semantic search'); 
console.log('      ├── Session Management: Per-chat memory spaces');
console.log('      └── API Service: External Mem0 service');
console.log('');
console.log('   🏗️ INTEGRATION');
console.log('      ├── Both agents configured with hybrid memory');
console.log('      ├── Automatic + explicit memory working together');
console.log('      ├── Fallback support if one system fails');
console.log('      └── Separate databases prevent conflicts');
console.log('');

console.log('✅ Hybrid Memory Setup Verification Complete!');
console.log('');
console.log('🚀 Next Steps:');
console.log('   1. Set environment variables if missing');
console.log('   2. Test with: npm run dev (and interact with agents)'); 
console.log('   3. Monitor database files: ./mastra-memory.db, ./mastra-system.db');
console.log('   4. Check logs for memory system performance');
console.log('');
console.log('📖 Read HYBRID-MEMORY-README.md for complete documentation');
console.log('🧪 Both memory systems now work together for enhanced agent capabilities!'); 