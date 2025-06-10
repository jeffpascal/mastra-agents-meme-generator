import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  analyzeImageStep,
  extractContentThemesStep,
  findBaseMemeStep,
  generateCaptionsStep,
  generateMemeStep,
} from './steps';

export const memeGenerationWorkflow = createWorkflow({
  id: 'meme-generation',
  description: 'Complete workflow to generate memes from any kind of text or situation',
  inputSchema: z.object({
    userInput: z.string().describe('Raw user input about any topic or situation'),
    contextualRequest: z.boolean().optional().describe('Whether this is a contextual request referencing previous content'),
    previousContext: z.string().optional().describe('Previous meme context for contextual requests'),
  }),
  outputSchema: z.object({
    shareableUrl: z.string(),
    pageUrl: z.string().optional(),
    analysis: z.object({
      message: z.string(),
    }),
  }),
  steps: [
    analyzeImageStep,
    extractContentThemesStep,
    findBaseMemeStep,
    generateCaptionsStep,
    generateMemeStep,
  ],
});

// Build the workflow chain with data mapping
memeGenerationWorkflow
  .then(analyzeImageStep)
  .then(extractContentThemesStep)
  .then(findBaseMemeStep)
  .map({
    themes: {
      step: extractContentThemesStep,
      path: 'themes',
    },
    overallMood: {
      step: extractContentThemesStep,
      path: 'overallMood',
    },
    suggestedMemeStyle: {
      step: extractContentThemesStep,
      path: 'suggestedMemeStyle',
    },
    language: {
      step: extractContentThemesStep,
      path: 'language',
    },
    isContextual: {
      step: extractContentThemesStep,
      path: 'isContextual',
    },
    baseTemplate: {
      step: findBaseMemeStep,
      path: 'templates.0',
    },
  })
  .then(generateCaptionsStep)
  .map({
    baseTemplate: {
      step: findBaseMemeStep,
      path: 'templates.0',
    },
    captions: {
      step: generateCaptionsStep,
      path: '.',
    },
  })
  .then(generateMemeStep)
  .map({
    shareableUrl: {
      step: generateMemeStep,
      path: 'imageUrl',
    },
    pageUrl: {
      step: generateMemeStep,
      path: 'pageUrl',
    },
    analysis: {
      step: generateMemeStep,
      path: 'analysis',
    },
  })
  .commit();