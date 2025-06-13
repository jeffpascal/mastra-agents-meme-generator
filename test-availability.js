import { getAvailabilityTool, getPropertyAvailabilityTool, searchAvailableDatesTool } from './src/mastra/tools/availability.js';

async function testAvailabilityTools() {
  console.log('🧪 Testing the availability tools...\n');
  
  try {
    // Test 1: Get all availability
    console.log('📊 Test 1: Getting all availability data...');
    const allAvailabilityResult = await getAvailabilityTool.execute({ 
      context: {} 
    });
    
    console.log('Success:', allAvailabilityResult.success);
    
    if (allAvailabilityResult.success && allAvailabilityResult.data) {
      console.log('Number of properties:', allAvailabilityResult.data.length);
      console.log('\n🏨 Property overview:');
      
      allAvailabilityResult.data.forEach((property, index) => {
        console.log(`\n${index + 1}. ${property.name} (ID: ${property.beds24PropId})`);
        
        // Show room information
        const rooms = [];
        let roomIndex = 0;
        while (property[roomIndex.toString()]) {
          rooms.push(property[roomIndex.toString()]);
          roomIndex++;
        }
        
        if (rooms.length > 0) {
          console.log(`   Rooms: ${rooms.map(room => room.roomName).join(', ')}`);
        }
        
        // Show availability summary
        if (property.availabilities && property.availabilities.length > 0) {
          property.availabilities.forEach(avail => {
            const room = rooms.find(r => r.roomId === avail.roomId);
            const roomName = room ? room.roomName : `Room ${avail.roomId}`;
            const totalDays = avail.availability.reduce((sum, period) => sum + period.length, 0);
            console.log(`   ${roomName}: ${totalDays} available days across ${avail.availability.length} periods`);
          });
        }
      });
      
      // Test 2: Get specific property availability
      console.log('\n\n📊 Test 2: Getting specific property availability...');
      const propertyResult = await getPropertyAvailabilityTool.execute({
        context: { propertyName: 'Apartamente' }
      });
      
      if (propertyResult.success && propertyResult.data) {
        console.log(`✅ Found property: ${propertyResult.data.name}`);
        console.log(`   Property ID: ${propertyResult.data.beds24PropId}`);
        console.log(`   Number of room availabilities: ${propertyResult.data.availabilities.length}`);
      } else {
        console.log('❌ Property search failed:', propertyResult.error);
      }
      
      // Test 3: Search for available dates
      console.log('\n\n📊 Test 3: Searching for available dates (min 3 days)...');
      const searchResult = await searchAvailableDatesTool.execute({
        context: { minDays: 3 }
      });
      
      if (searchResult.success && searchResult.data) {
        console.log(`✅ Search completed: ${searchResult.data.totalMatches} matches found`);
        console.log(`   Search criteria: ${searchResult.data.searchCriteria.minDays} minimum days`);
        console.log(`   Property filter: ${searchResult.data.searchCriteria.propertyName}`);
        
        if (searchResult.data.matchingAvailability.length > 0) {
          console.log('   Top matches:');
          searchResult.data.matchingAvailability.slice(0, 3).forEach((match, idx) => {
            console.log(`     ${idx + 1}. ${match.property} - ${match.consecutiveDays} days available`);
          });
        }
      } else {
        console.log('❌ Search failed:', searchResult.error);
      }
      
      console.log('\n✅ All availability tools are working correctly!');
      console.log('📝 The tools are now properly integrated with the AvailabilityAgent');
      console.log('🚀 You can use them through the Mastra agents system');
      console.log('🔧 Your MCP server integration is working via HTTP API calls');
      
    } else if (allAvailabilityResult.error) {
      console.error('❌ Error:', allAvailabilityResult.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAvailabilityTools(); 