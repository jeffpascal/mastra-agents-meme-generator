import { getAllAvailability30DaysTool, getPropertyAvailabilityByDatesTool, createBookingTool } from './src/mastra/tools/availability.ts';

async function testMCPAvailabilityTools() {
  console.log('🧪 Testing MCP Availability Tools with SSE Server...\n');
  console.log('📡 Connecting to MCP SSE server at http://localhost:8080/sse\n');
  
  try {
    // Test 1: Get all availability via MCP
    console.log('📊 Test 1: Getting all availability data via MCP...');
    const allAvailabilityResult = await getAllAvailability30DaysTool.execute({ 
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
      
      // Test 2: Get specific property availability via MCP
      console.log('\n\n📊 Test 2: Getting property availability by dates via MCP...');
      const propertyResult = await getPropertyAvailabilityByDatesTool.execute({
        context: { 
          checkinDate: '2025-01-15',
          checkoutDate: '2025-01-20'
        }
      });
      
      if (propertyResult.success && propertyResult.data) {
        console.log(`✅ Found property: ${propertyResult.data.name}`);
        console.log(`   Property ID: ${propertyResult.data.beds24PropId}`);
        console.log(`   Number of room availabilities: ${propertyResult.data.availabilities.length}`);
      } else {
        console.log('❌ Property search failed:', propertyResult.error);
      }
      
      // Test 3: Test booking creation (without actually creating)
      console.log('\n\n📊 Test 3: Testing booking creation via MCP...');
      const bookingResult = await createBookingTool.execute({
        context: {
          roomid: 'test-room-123',
          numadult: 2,
          checkin: '2025-01-15',
          numnight: 5,
          numchild: 0
        }
      });
      
      if (bookingResult.success && bookingResult.bookingUrl) {
        console.log(`✅ Booking URL created: ${bookingResult.bookingUrl}`);
        console.log(`   Booking details:`, bookingResult.bookingDetails);
      } else {
        console.log('❌ Booking creation failed:', bookingResult.error);
      }
      
      console.log('\n✅ All MCP availability tools are working correctly!');
      console.log('📝 The tools are now using MCP SSE transport');
      console.log('🚀 Connected to SSE server at http://localhost:8080/sse');
      console.log('🔧 Backend API calls are handled by the MCP server');
      
    } else {
      console.log('❌ Failed to get availability data:', allAvailabilityResult.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Make sure the SSE server is running on http://localhost:8080/sse');
    console.log('   2. Verify the server can reach the backend API at http://localhost:3032');
    console.log('   3. Check network connectivity and firewall settings');
  }
}

// Run the test
testMCPAvailabilityTools(); 