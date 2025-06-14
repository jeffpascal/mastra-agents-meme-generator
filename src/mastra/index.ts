import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { registerCopilotKit } from '@mastra/agui';
import { memeGeneratorAgent } from './agents/meme-generator';
import { availabilityAgent } from './agents/availability-agent';
import { memeGenerationWorkflow } from './workflows/meme-generation';

// Environment-aware database path
const getSystemDbPath = () => {
  // Use Docker path if in container, relative path for local development
  const isDocker = process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV === 'true';
  return isDocker ? 'file:/data/mastra-ai/mastra-system.db' : 'file:./mastra-system.db';
};

// Workaround for Mastra bug #4497: Storage is required even when it should be optional
// See: https://github.com/mastra-ai/mastra/issues/4497
// This will be fixed in a future Mastra release
const storage = new LibSQLStore({
  url: getSystemDbPath(),
});

export const mastra = new Mastra({
  storage, // Required as workaround for bug #4497
  agents: {
    availability: availabilityAgent,
    memeGenerator: memeGeneratorAgent
  },
  workflows: {
    'meme-generation': memeGenerationWorkflow,
  },
  telemetry: {
    enabled: true, // Now working with storage
  },
  server: {
    // CORS configuration for CopilotKit integration
    cors: {
      origin: "*",
      allowMethods: ["*"],
      allowHeaders: ["*"]
    },
    apiRoutes: [
      registerCopilotKit({
        path: "/copilotkit",
        resourceId: "availability",
        setContext: (c, runtimeContext) => {
          // Add context for the agents
          runtimeContext.set("user-id", c.req.header("X-User-ID") || "anonymous");
          runtimeContext.set("session-id", c.req.header("X-Session-ID") || "default");
          
          // Extract and pass instructions from frontend
          const instructions = c.req.header("X-Instructions");
          if (instructions) {
            console.log("Instructions:", instructions);
            runtimeContext.set("instructions", instructions);
          }

        }
      })
    ]
  }
});