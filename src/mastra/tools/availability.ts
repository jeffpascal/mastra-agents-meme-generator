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
const MCP_SERVER_URL = 'http://127.0.0.1:8080/message';
const REQUEST_TIMEOUT_MS = 60000; // 1 minute timeout
const MAX_RETRY_ATTEMPTS = 5; // 1 initial attempt + 4 retries

// Utility function to add timeout to fetch requests
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Utility function to sleep/delay execution
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to determine if an error is retriable
function isRetriableError(error: any): boolean {
  // Network errors, timeouts, and 5xx HTTP errors are retriable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true; // Network error
  }
  if (error.message?.includes('timeout')) {
    return true; // Timeout error
  }
  if (error.message?.includes('HTTP 5')) {
    return true; // 5xx server errors
  }
  if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
    return true; // Connection errors
  }
  return false;
}

// Retry wrapper function with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxAttempts: number = MAX_RETRY_ATTEMPTS
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 ${operationName} - Attempt ${attempt}/${maxAttempts}`);
      const result = await operation();
      if (attempt > 1) {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts || !isRetriableError(lastError)) {
        console.error(`❌ ${operationName} failed after ${attempt} attempts:`, lastError.message);
        break;
      }
      
      // Calculate exponential backoff delay: 1s, 2s, 4s, 8s
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      console.log(`⏳ ${operationName} failed on attempt ${attempt}, retrying in ${delayMs}ms...`);
      console.log(`   Error: ${lastError.message}`);
      
      await sleep(delayMs);
    }
  }
  
  throw lastError;
}

// Helper function to call MCP server directly via HTTP with retry mechanism
async function callMCPTool(toolName: string, args: any) {
  return withRetry(async () => {
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
    
    const response = await fetchWithTimeout(MCP_SERVER_URL, {
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
  }, `MCP Tool Call (${toolName})`).catch(error => {
    console.error(`❌ Error calling MCP tool ${toolName} after all retries:`, error);
    throw new Error(`Failed to call MCP tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  });
}

// Helper function to test MCP server availability with retry mechanism
async function testMCPConnection(): Promise<boolean> {
  try {
    await withRetry(async () => {
      console.log('🔍 Testing MCP server connection...');
      
      const rpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {}
      };
      
      const response = await fetchWithTimeout(MCP_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(rpcRequest)
      });

      if (!response.ok) {
        throw new Error(`MCP server responded with ${response.status}: ${response.statusText}`);
      }

      const rpcResponse = await response.json() as any;
      
      if (rpcResponse.error) {
        throw new Error(`MCP server error: ${rpcResponse.error.message}`);
      }
      
      if (!rpcResponse.result || !rpcResponse.result.tools) {
        throw new Error('Unexpected MCP response format');
      }
      
      const tools = rpcResponse.result.tools;
      console.log(`✅ MCP server connected successfully`);
      console.log(`🔧 Available tools: ${tools.map((t: any) => t.name).join(', ')}`);
      return true;
    }, 'MCP Connection Test');
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to MCP server after all retries:`, error);
    console.log(`💡 Make sure your SSE server is running on port 8080`);
    return false;
  }
}

// Utility function to convert date object to readable string
function formatDate(dateObj: { year: string; month: string; day: string }): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = monthNames[parseInt(dateObj.month) - 1];
  const day = parseInt(dateObj.day);
  return `${day} ${month}`;
}

// Utility function to convert availability periods to readable date ranges
function formatAvailabilityPeriods(periods: Array<Array<{ year: string; month: string; day: string }>>): string[] {
  const ranges: string[] = [];
  
  for (const period of periods) {
    if (period.length === 0) continue;
    
    if (period.length === 1) {
      // Single date
      ranges.push(formatDate(period[0]));
    } else {
      // Date range - check if dates are consecutive
      const sortedDates = period.sort((a, b) => {
        const dateA = new Date(parseInt(a.year), parseInt(a.month) - 1, parseInt(a.day));
        const dateB = new Date(parseInt(b.year), parseInt(b.month) - 1, parseInt(b.day));
        return dateA.getTime() - dateB.getTime();
      });
      
      // Check if all dates are consecutive
      let isConsecutive = true;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(parseInt(sortedDates[i-1].year), parseInt(sortedDates[i-1].month) - 1, parseInt(sortedDates[i-1].day));
        const currDate = new Date(parseInt(sortedDates[i].year), parseInt(sortedDates[i].month) - 1, parseInt(sortedDates[i].day));
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (dayDiff !== 1) {
          isConsecutive = false;
          break;
        }
      }
      
      if (isConsecutive) {
        // Show as range
        const startDate = formatDate(sortedDates[0]);
        const endDate = formatDate(sortedDates[sortedDates.length - 1]);
        ranges.push(`${startDate}-${endDate}`);
      } else {
        // Show individual dates
        ranges.push(...sortedDates.map(formatDate));
      }
    }
  }
  
  return ranges;
}

// Utility function to create human-readable availability summary
function createAvailabilitySummary(rawData: any): string[] {
  const summary: string[] = [];
  
  try {
    // Extract date range information if available
    let dateRangeInfo = '';
    if (rawData.checkinDate && rawData.checkoutDate) {
      const checkinDate = new Date(rawData.checkinDate);
      const checkoutDate = new Date(rawData.checkoutDate);
      const formatOptions: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      };
      const startFormatted = checkinDate.toLocaleDateString('en-US', formatOptions);
      const endFormatted = checkoutDate.toLocaleDateString('en-US', formatOptions);
      dateRangeInfo = `📅 Availability Period: ${startFormatted} to ${endFormatted}`;
    } else {
      // Default to next 30 days if no specific dates provided
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30);
      const formatOptions: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      };
      const startFormatted = today.toLocaleDateString('en-US', formatOptions);
      const endFormatted = futureDate.toLocaleDateString('en-US', formatOptions);
      dateRangeInfo = `📅 Availability Period: ${startFormatted} to ${endFormatted} (next 30 days)`;
    }
    
    // Add period information at the beginning
    summary.push(dateRangeInfo);
    summary.push(''); // Empty line for readability
    
    // Handle both direct array format and wrapped format
    const propertiesData = Array.isArray(rawData) ? rawData : (rawData.propertiesData || rawData.data);
    
    if (!Array.isArray(propertiesData)) {
      return [dateRangeInfo, '', '❌ Invalid data format - expected array of properties'];
    }
    
    // Process each property
    for (const property of propertiesData) {
      const propertyName = property.name || 'Unknown Property';
      const availabilities = property.availabilities || [];
      
      // Create a map of roomId to room name
      const roomMap = new Map<string, string>();
      
      // Extract room information from numbered keys
      Object.keys(property).forEach(key => {
        if (!isNaN(parseInt(key)) && property[key].roomId && property[key].roomName) {
          roomMap.set(property[key].roomId, property[key].roomName);
        }
      });
      
      // Process each room's availability
      for (const availability of availabilities) {
        const roomId = availability.roomId;
        const roomName = roomMap.get(roomId) || `Room ${roomId}`;
        const availabilityPeriods = availability.availability || [];
        
        if (availabilityPeriods.length > 0) {
          const dateRanges = formatAvailabilityPeriods(availabilityPeriods);
          if (dateRanges.length > 0) {
            summary.push(`- ${roomName} (roomId: ${roomId}) - Available: ${dateRanges.join(', ')}`);
          }
        } else {
          summary.push(`- ${roomName} (roomId: ${roomId}) - No availability in selected period`);
        }
      }
    }
    
    // If no availability data was found (only date info and empty line)
    if (summary.length <= 2) {
      summary.push('No availability data found for any properties in this period');
    }
    
    // Add note about querying different dates
    summary.push(''); // Empty line for readability
    summary.push('💡 Note: For availability outside this date range, please use the availability tool again with your desired dates.');
    
  } catch (error) {
    console.error('Error creating availability summary:', error);
    summary.push(`❌ Error processing availability data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return summary;
}

// MASTRA TOOLS USING DIRECT MCP HTTP CALLS

export const getAllAvailability30DaysTool = createTool({
  id: 'get-all-availability-30-days',
  description: 'Retrieve complete availability data for all properties and rooms for the next 30 days. Use this for general availability overviews, when user wants to see all properties, or needs broad availability information without specific dates.',
  inputSchema: z.object({
    refresh: z.boolean().optional().describe('Set to true to force fresh data instead of cached data (default: false)'),
    humanReadable: z.boolean().optional().describe('Set to true to return human-readable summary instead of raw data (default: false)'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the request was successful'),
    data: z.array(PropertySchema).optional().describe('Array of property objects with room availability data for all properties'),
    summary: z.array(z.string()).optional().describe('Human-readable summary of availability (when humanReadable=true)'),
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

      // If human readable format is requested
      if (context.humanReadable) {
        const summary = createAvailabilitySummary(rawData);
        console.log('📝 Created human-readable availability summary');
        return {
          success: true,
          summary: summary,
        };
      }

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
  description: 'Get availability data for all properties within a custom date range. Use this when user provides check-in/check-out dates to search for availability across all properties.',
  inputSchema: z.object({
    checkinDate: z.string().describe('Check-in date in YYYY-MM-DD format'),
    checkoutDate: z.string().describe('Check-out date in YYYY-MM-DD format'),
    refresh: z.boolean().optional().describe('Forces fresh data generation (default: false)'),
    humanReadable: z.boolean().describe('Set to true to return human-readable summary instead of raw data (default: true)'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the request was successful'),
    data: PropertySchema.optional().describe('Property object with availability data within the specified date range'),
    summary: z.array(z.string()).optional().describe('Human-readable summary of availability (when humanReadable=true)'),
    error: z.string().optional().describe('Error message if request failed'),
  }),
  execute: async ({ context }) => {
    try {
      console.log(`🏨 Fetching availability for all properties from ${context.checkinDate} to ${context.checkoutDate} via MCP`);
      
      const mcpArgs = {
        checkinDate: context.checkinDate,
        checkoutDate: context.checkoutDate,
        refresh: context.refresh || true
      };

      const result = await callMCPTool('get_property_availability_by_dates', mcpArgs);
      
      console.log(`✅ Property availability data fetched successfully for all properties via MCP`);

      // If human readable format is requested
      if (context.humanReadable) {
        const summary = createAvailabilitySummary(result);
        console.log('📝 Created human-readable availability summary');
        return {
          success: true,
          summary: summary,
        };
      }

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
    numadult: z.number().min(1).describe('If user does not provide a number of adults, use 2 as default (minimum: 1)'),
    checkin: z.string().describe('Check-in date (YYYY-MM-DD)'),
    numnight: z.number().min(1).optional().describe('Number of nights (optional if checkout provided)'),
    checkout: z.string().optional().describe('Check-out date (YYYY-MM-DD, optional if numnight provided)'),
    numchild: z.number().min(0).default(0).describe('If user does not provide a number of children, use 0 as default. Number of children (default: 0)'),
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
    console.log('⚠️ Make sure the SSE server is running on http://172.31.0.18:8080');
  }
}

// Test connection on module load
initializeMCP().catch(console.error);

// LEGACY TOOLS - DEPRECATED
// These are kept for backwards compatibility but should not be used
export const getAvailabilityTool = getAllAvailability30DaysTool;
export const getPropertyAvailabilityTool = getPropertyAvailabilityByDatesTool;
export const searchAvailableDatesTool = getAllAvailability30DaysTool; 