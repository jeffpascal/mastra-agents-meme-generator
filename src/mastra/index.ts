import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { memeGeneratorAgent } from './agents/meme-generator';
import { memeGenerationWorkflow } from './workflows/meme-generation';

// Workaround for Mastra bug #4497: Storage is required even when it should be optional
// See: https://github.com/mastra-ai/mastra/issues/4497
// This will be fixed in a future Mastra release
const storage = new LibSQLStore({
  url: 'file:./mastra-system.db',
});

export const mastra = new Mastra({
  storage, // Required as workaround for bug #4497
  agents: {
    memeGenerator: memeGeneratorAgent,
  },
  workflows: {
    'meme-generation': memeGenerationWorkflow,
  },
  telemetry: {
    enabled: true, // Now working with storage
  },
});