import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { contentAnalysisSchema } from '../schemas';

export const extractContentThemesStep = createStep({
  id: 'extract-content-themes',
  description:
    'Extract and categorize content themes from raw input using AI',
  inputSchema: z.object({
    hasImage: z.boolean(),
    imageUrl: z.string().optional(),
    imageDescription: z.string().optional(),
    enhancedPrompt: z.string(),
    language: z.string().describe('Language for meme generation'),
    isContextual: z.boolean().describe('Whether this was a contextual request'),
    analysis: z.object({
      message: z.string(),
    }),
  }),
  outputSchema: contentAnalysisSchema.extend({
    language: z.string().describe('Language for meme generation'),
    isContextual: z.boolean().describe('Whether this was a contextual request'),
    analysis: z.object({
      message: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    try {
      const contextualNote = inputData.isContextual ? ' (contextual request)' : '';
      console.log(`🔍 Analyzing your content for meme generation in ${inputData.language}${contextualNote}...`);

      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: contentAnalysisSchema,
        prompt: `
          Analyze this content for meme generation and extract structured information:
          
          "${inputData.enhancedPrompt}"
          ${inputData.hasImage && inputData.imageDescription ? `\nImage context: ${inputData.imageDescription}` : ''}
          ${inputData.isContextual ? '\n\nNOTE: This is a contextual request that modifies or references previous content. Pay special attention to what the user wants to change or modify.' : ''}
          
          Extract:
          - Main themes with categories (humor, frustration, excitement, etc.)
          - Overall mood and emotional tone
          - Keywords for each theme
          - Suggested meme style that would work best
          
          This could be about any topic - work, relationships, entertainment, life situations, etc.
          Keep analysis concise and focused. Consider the emotional context and what type of meme would be most appropriate.
          
          IMPORTANT: The meme will be generated in ${inputData.language}. Consider cultural context and humor styles appropriate for ${inputData.language} speakers.
          
          Please provide your analysis in English (for structured data), but keep in mind that the final meme text will be in ${inputData.language}.
        `,
      });

      const contentAnalysis = result.object;

      console.log(
        `✅ Found ${contentAnalysis.themes.length} themes, mood: ${contentAnalysis.overallMood} (Language: ${inputData.language}${contextualNote})`,
      );

      return {
        ...contentAnalysis,
        language: inputData.language,
        isContextual: inputData.isContextual,
        analysis: {
          message: `Analyzed content in ${inputData.language} - main theme: ${contentAnalysis.themes[0]?.category} (${contentAnalysis.overallMood} mood)${contextualNote}`,
        },
      };
    } catch (error) {
      console.error('Error extracting content themes:', error);
      throw new Error('Failed to analyze content');
    }
  },
});

// Keep the old export for backward compatibility
export const extractFrustrationsStep = extractContentThemesStep;