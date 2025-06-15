// Simple test of MCP server connection and tool calls
async function testMCPServer() {
  console.log('🧪 Testing MCP Server Direct Connection...\n');
  
  const MCP_SERVER_URL = 'http://localhost:8080/message';
  
  try {
    // Test 1: List available tools
    console.log('📋 Test 1: Listing available tools...');
    const listRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {}
    };
    
    const listResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(listRequest)
    });

    if (!listResponse.ok) {
      throw new Error(`HTTP ${listResponse.status}: ${listResponse.statusText}`);
    }

    const listResult = await listResponse.json();
    
    if (listResult.error) {
      throw new Error(`MCP Error: ${listResult.error.message}`);
    }
    
    const tools = listResult.result.tools;
    console.log(`✅ Found ${tools.length} tools:`);
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    
    // Test 2: Call get_all_availability_30_days
    console.log('\n📊 Test 2: Calling get_all_availability_30_days...');
    const availabilityRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'get_all_availability_30_days',
        arguments: { refresh: false }
      }
    };
    
    const availabilityResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(availabilityRequest)
    });

    if (!availabilityResponse.ok) {
      throw new Error(`HTTP ${availabilityResponse.status}: ${availabilityResponse.statusText}`);
    }

    const availabilityResult = await availabilityResponse.json();
    
    if (availabilityResult.error) {
      throw new Error(`MCP Error: ${availabilityResult.error.message}`);
    }
    
    // Parse the content from MCP response
    const result = availabilityResult.result;
    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find(c => c.type === 'text');
      if (textContent) {
        const data = JSON.parse(textContent.text);
        console.log(`✅ Successfully fetched availability data`);
        console.log(`📊 Found ${Array.isArray(data) ? data.length : 'unknown'} properties`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('\n🏨 Property overview:');
          data.slice(0, 3).forEach((property, index) => {
            console.log(`   ${index + 1}. ${property.name} (ID: ${property.beds24PropId})`);
          });
        }
      }
    }
    
    // Test 3: Call get_property_availability_by_dates
    console.log('\n🔍 Test 3: Calling get_property_availability_by_dates...');
    const propertyRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'get_property_availability_by_dates',
        arguments: {
          checkinDate: '2025-01-15',
          checkoutDate: '2025-01-20',
          refresh: true
        }
      }
    };
    
    const propertyResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(propertyRequest)
    });

    if (!propertyResponse.ok) {
      throw new Error(`HTTP ${propertyResponse.status}: ${propertyResponse.statusText}`);
    }

    const propertyResult = await propertyResponse.json();
    
    if (propertyResult.error) {
      throw new Error(`MCP Error: ${propertyResult.error.message}`);
    }
    
    const propertyData = propertyResult.result;
    if (propertyData.content && Array.isArray(propertyData.content)) {
      const textContent = propertyData.content.find(c => c.type === 'text');
      if (textContent) {
        const data = JSON.parse(textContent.text);
        console.log(`✅ Successfully fetched property data for ${data.propertyName}`);
        if (data.propertyData) {
          console.log(`   Property: ${data.propertyData.name}`);
          console.log(`   Property ID: ${data.propertyData.beds24PropId}`);
        }
      }
    }
    
    console.log('\n🎉 All MCP tests completed successfully!');
    console.log('✅ Your MCP server is working correctly');
    console.log('✅ Tools can fetch data from the backend API');
    console.log('✅ Mastra availability tools should now work via MCP');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Make sure the SSE server is running on http://localhost:8080');
    console.log('   2. Verify the backend API is running on http://localhost:3032');
    console.log('   3. Check server logs for any errors');
  }
}

testMCPServer(); 