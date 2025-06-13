import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Define the schema for room availability data
const RoomAvailabilitySchema = z.object({
  roomName: z.string(),
  roomId: z.string(),
});

const DateSchema = z.object({
  year: z.string(),
  month: z.string(),
  day: z.string(),
});

const AvailabilityPeriodSchema = z.array(DateSchema);

const RoomAvailabilityDataSchema = z.object({
  roomId: z.string(),
  availability: z.array(AvailabilityPeriodSchema),
});

const PropertySchema = z.object({
  name: z.string(),
  beds24PropId: z.string(),
  availabilities: z.array(RoomAvailabilityDataSchema),
}).catchall(RoomAvailabilitySchema); // This handles the dynamic numbered keys like "0", "1", "2"

// MCP Server configuration
const MCP_SERVER_URL = 'http://localhost:8080/message';

// Helper function to call MCP server directly via HTTP
async function callMCPTool(toolName: string, args: any) {
  try {
    console.log(`🔧 Calling MCP tool: ${toolName} via HTTP`);
    console.log(`📝 Tool arguments:`, JSON.stringify(args, null, 2));
    
    // Create MCP JSON-RPC 2.0 request
    const rpcRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };
    
    console.log(`📡 Sending request to ${MCP_SERVER_URL}`);
    
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(rpcRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rpcResponse = await response.json() as any;
    console.log(`✅ Received MCP response for ${toolName}`);
    
    // Handle JSON-RPC 2.0 response
    if (rpcResponse.error) {
      throw new Error(`MCP Error: ${rpcResponse.error.message}`);
    }
    
    if (!rpcResponse.result) {
      throw new Error('No result in MCP response');
    }
    
    // Extract content from MCP response
    const result = rpcResponse.result;
    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent) {
        console.log('📄 Parsing JSON response from MCP tool');
        return JSON.parse(textContent.text);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error calling MCP tool ${toolName}:`, error);
    throw new Error(`Failed to call MCP tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to test MCP server availability
async function testMCPConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing MCP server connection...');
    
    const rpcRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {}
    };
    
    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(rpcRequest)
    });

    if (!response.ok) {
      console.error(`❌ MCP server responded with ${response.status}: ${response.statusText}`);
      return false;
    }

    const rpcResponse = await response.json() as any;
    
    if (rpcResponse.error) {
      console.error(`❌ MCP server error:`, rpcResponse.error);
      return false;
    }
    
    if (rpcResponse.result && rpcResponse.result.tools) {
      const tools = rpcResponse.result.tools;
      console.log(`✅ MCP server connected successfully`);
      console.log(`🔧 Available tools: ${tools.map((t: any) => t.name).join(', ')}`);
      return true;
    }
    
    console.error(`❌ Unexpected MCP response format`);
    return false;
  } catch (error) {
    console.error(`❌ Failed to connect to MCP server:`, error);
    console.log(`💡 Make sure your SSE server is running on port 8080`);
    return false;
  }
}

// MASTRA TOOLS USING DIRECT MCP HTTP CALLS

export const getAllAvailability30DaysTool = createTool({
  id: 'get-all-availability-30-days',
  description: 'Retrieve complete availability data for all properties and rooms for the next 30 days. Use this for general availability overviews, when user wants to see all properties, or needs broad availability information without specific dates.',
  inputSchema: z.object({
    refresh: z.boolean().optional().describe('Set to true to force fresh data instead of cached data (default: false)'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the request was successful'),
    data: z.array(PropertySchema).optional().describe('Array of property objects with room availability data for all properties'),
    error: z.string().optional().describe('Error message if request failed'),
  }),
  execute: async ({ context }) => {
    try {
      console.log('🏨 Fetching all property availability for the next 30 days via MCP...');
      
      const mcpArgs = {
        refresh: context.refresh || false
      };

      const rawData = await callMCPTool('get_all_availability_30_days', mcpArgs);
      
      console.log('✅ All property availability data fetched successfully via MCP');
      console.log(`📊 Found ${Array.isArray(rawData) ? rawData.length : 'unknown'} properties with availability data`);

      // Validate the data against our schema if it's an array
      if (Array.isArray(rawData)) {
        const validatedData = z.array(PropertySchema).parse(rawData);
        return {
          success: true,
          data: validatedData,
        };
      } else {
        // If response is already structured (success/data format), return as-is
        return rawData;
      }
    } catch (error) {
      console.error('❌ Error fetching all property availability via MCP:', error);
      return {
        success: false,
        error: `Error fetching all property availability via MCP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

export const getPropertyAvailabilityByDatesTool = createTool({
  id: 'get-property-availability-by-dates',
  description: 'Get availability data for one specific property within a custom date range. Use this when user specifies a particular property name AND provides check-in/check-out dates, or when doing targeted property searches.',
  inputSchema: z.object({
    propertyName: z.string().describe('Name of the property to search for (e.g., "Apartamente", "Casa Pescarului", "Vila Franceza", "Casa Gabriela")'),
    checkinDate: z.string().describe('Check-in date in YYYY-MM-DD format'),
    checkoutDate: z.string().describe('Check-out date in YYYY-MM-DD format'),
    refresh: z.boolean().optional().describe('Forces fresh data generation (default: false)'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the request was successful'),
    data: PropertySchema.optional().describe('Property object with availability data within the specified date range'),
    error: z.string().optional().describe('Error message if request failed'),
  }),
  execute: async ({ context }) => {
    try {
      console.log(`🏨 Fetching availability for property: ${context.propertyName} from ${context.checkinDate} to ${context.checkoutDate} via MCP`);
      
      const mcpArgs = {
        propertyName: context.propertyName,
        checkinDate: context.checkinDate,
        checkoutDate: context.checkoutDate,
        refresh: context.refresh || true
      };

      const result = await callMCPTool('get_property_availability_by_dates', mcpArgs);
      
      console.log(`✅ Property availability data fetched successfully for ${context.propertyName} via MCP`);

      // Extract the propertyData from the MCP response
      if (result && result.propertyData) {
        const validatedData = PropertySchema.parse(result.propertyData);
        return {
          success: true,
          data: validatedData,
        };
      }

      return result;
    } catch (error) {
      console.error('❌ Error fetching property availability by dates via MCP:', error);
      return {
        success: false,
        error: `Error fetching property availability by dates via MCP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

export const createBookingTool = createTool({
  id: 'create-booking',
  description: 'Create a beds24 booking URL with specified parameters for a room reservation',
  inputSchema: z.object({
    roomid: z.string().describe('Room ID to book'),
    numadult: z.number().min(1).describe('Number of adults (minimum: 1)'),
    checkin: z.string().describe('Check-in date (YYYY-MM-DD)'),
    numnight: z.number().min(1).optional().describe('Number of nights (optional if checkout provided)'),
    checkout: z.string().optional().describe('Check-out date (YYYY-MM-DD, optional if numnight provided)'),
    numchild: z.number().min(0).default(0).describe('Number of children (default: 0)'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the booking URL was created successfully'),
    bookingUrl: z.string().optional().describe('The generated booking URL'),
    bookingDetails: z.object({
      roomId: z.string(),
      checkIn: z.string(),
      checkOut: z.string().optional(),
      nights: z.number().optional(),
      adults: z.number(),
      children: z.number(),
    }).optional().describe('Summary of booking details'),
    error: z.string().optional().describe('Error message if request failed'),
  }),
  execute: async ({ context }) => {
    try {
      console.log(`🎯 Creating booking URL for room ${context.roomid} via MCP`);
      
      // Validate required parameters
      if (!context.roomid || !context.numadult || !context.checkin) {
        throw new Error('Missing required parameters: roomid, numadult, and checkin are required');
      }

      // Validate that either numnight or checkout is provided
      if (!context.numnight && !context.checkout) {
        throw new Error('Either numnight or checkout must be provided');
      }

      // Calculate checkout date if only numnight is provided
      let checkoutDate: string;
      let nights: number;

      if (context.checkout) {
        checkoutDate = context.checkout;
        // Calculate nights if checkout is provided
        const checkinDate = new Date(context.checkin);
        const checkoutDateObj = new Date(context.checkout);
        nights = Math.ceil((checkoutDateObj.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        nights = context.numnight!;
        const checkinDate = new Date(context.checkin);
        checkinDate.setDate(checkinDate.getDate() + nights);
        checkoutDate = checkinDate.toISOString().split('T')[0];
      }

      // Prepare MCP args
      const mcpArgs = {
        roomid: context.roomid,
        numadult: context.numadult,
        checkin: context.checkin,
        numnight: nights,
        numchild: context.numchild || 0,
      };

      const result = await callMCPTool('create_booking', mcpArgs);
      
      console.log('✅ Booking URL created successfully via MCP');

      // If the result has a direct bookingUrl, wrap it in our expected format
      if (result && result.bookingUrl) {
        return {
          success: true,
          bookingUrl: result.bookingUrl,
          bookingDetails: {
            roomId: context.roomid,
            checkIn: context.checkin,
            checkOut: checkoutDate,
            nights: nights,
            adults: context.numadult,
            children: context.numchild || 0,
          },
        };
      }

      return result;
    } catch (error) {
      console.error('❌ Error creating booking URL via MCP:', error);
      return {
        success: false,
        error: `Error creating booking URL via MCP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Initialize connection test when module loads
let connectionTested = false;

async function initializeMCP() {
  if (connectionTested) return;
  
  try {
    console.log('🔌 Testing MCP server connection...');
    const isConnected = await testMCPConnection();
    connectionTested = true;
    
    if (isConnected) {
      console.log('✅ MCP server connection verified successfully');
    } else {
      console.log('⚠️ MCP server connection test failed - tools may not work correctly');
      console.log('💡 Make sure your SSE server is running: node sse-server.js');
    }
  } catch (error) {
    console.error('❌ Failed to test MCP server connection:', error);
    console.log('⚠️ Make sure the SSE server is running on http://localhost:8080');
  }
}

// Test connection on module load
initializeMCP().catch(console.error);

// LEGACY TOOLS - DEPRECATED
// These are kept for backwards compatibility but should not be used
export const getAvailabilityTool = getAllAvailability30DaysTool;
export const getPropertyAvailabilityTool = getPropertyAvailabilityByDatesTool;
export const searchAvailableDatesTool = getAllAvailability30DaysTool; 