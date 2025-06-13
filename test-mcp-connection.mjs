import { MCPClient } from '@mastra/mcp';

async function testMCPConnection() {
  console.log('🧪 Testing MCP Connection to SSE Server...\n');
  
  // Connect to the /message endpoint, not /sse
  const mcp = new MCPClient({
    servers: {
      availability: {
        url: new URL('http://localhost:8080/message'), // Changed from /sse to /message
        timeout: 5000,
        requestInit: {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        },
      },
    },
    timeout: 5000,
  });

  try {
    console.log('🔌 Attempting to connect to MCP server via /message endpoint...');
    console.time('Connection Time');
    
    const toolsets = await mcp.getToolsets();
    
    console.timeEnd('Connection Time');
    console.log('✅ Successfully connected!');
    console.log('🔧 Available toolsets:', Object.keys(toolsets));
    
    if (toolsets.availability) {
      console.log('🏨 Available tools:', Object.keys(toolsets.availability));
      
      // Test a tool call
      console.log('\n🧪 Testing tool call...');
      try {
        const result = await toolsets.availability.get_all_availability_30_days({ refresh: false });
        console.log('✅ Tool call successful!');
        console.log('📊 Result type:', typeof result);
        console.log('📏 Result length:', JSON.stringify(result).length, 'characters');
      } catch (toolError) {
        console.error('❌ Tool call failed:', toolError.message);
      }
    }
    
    // Disconnect
    await mcp.disconnect();
    console.log('✅ Disconnected successfully');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    console.log('\n🔍 Debug Information:');
    console.log('- Error type:', error.constructor.name);
    console.log('- Error message:', error.message);
    
    if (error.cause) {
      console.log('- Error cause:', error.cause);
    }
    
    console.log('\n💡 Correct Architecture:');
    console.log('- MCP Client → http://localhost:8080/message (for tool calls)');
    console.log('- Browser/SSE → http://localhost:8080/sse (for real-time updates)');
    console.log('- Health Check → http://localhost:8080/health');
  }
}

// Test SSE endpoint separately (for demonstration)
async function testSSEEndpoint() {
  console.log('\n🌊 Testing SSE Endpoint (for real-time streaming)...');
  
  try {
    const response = await fetch('http://localhost:8080/sse', {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (response.ok) {
      console.log('✅ SSE endpoint is accessible');
      console.log('📡 Content-Type:', response.headers.get('content-type'));
      console.log('💡 Use EventSource in browser to connect to this endpoint');
    } else {
      console.log('❌ SSE endpoint returned:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ SSE endpoint test failed:', error.message);
  }
}

async function runTests() {
  await testMCPConnection();
  await testSSEEndpoint();
}

runTests(); 