import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { contentAnalysisSchema, memeTemplateSchema, captionsSchema } from '../schemas';

export const generateCaptionsStep = createStep({
  id: 'generate-captions',
  description: 'Generate funny captions based on content themes and meme template',
  inputSchema: z.object({
    themes: z.array(
      z.object({
        text: z.string(),
        category: z.string(),
        intensity: z.string(),
        keywords: z.array(z.string()),
      }),
    ),
    overallMood: z.string(),
    suggestedMemeStyle: z.string(),
    language: z.string().describe('Language for meme generation'),
    isContextual: z.boolean().optional().describe('Whether this was a contextual request'),
    baseTemplate: memeTemplateSchema,
  }),
  outputSchema: captionsSchema,
  execute: async ({ inputData }) => {
    try {
      const contextualNote = inputData.isContextual ? ' (contextual request)' : '';
      console.log(
        `🎨 Generating captions for ${inputData.baseTemplate.name} meme in ${inputData.language}${contextualNote}...`
      );

      const mainTheme = inputData.themes[0];
      const mood = inputData.overallMood;

      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: captionsSchema,
        prompt: `
          Create meme captions for the "${inputData.baseTemplate.name}" meme template.
          
          Context:
          - Main theme: ${mainTheme.text}
          - Category: ${mainTheme.category}
          - Mood: ${mood}
          - Intensity: ${mainTheme.intensity}
          - Keywords: ${mainTheme.keywords.join(', ')}
          - Suggested style: ${inputData.suggestedMemeStyle}
          - Meme has ${inputData.baseTemplate.box_count} text boxes
          ${inputData.isContextual ? '\n- NOTE: This is a contextual request that modifies or references previous content.' : ''}
          
          LANGUAGE REQUIREMENT: Generate ALL captions in ${inputData.language}. This is very important!
          
          Make it funny and relatable. The humor should match the ${mood} mood and ${mainTheme.category} theme.
          This could be about any topic - work, relationships, life situations, entertainment, etc.
          Keep text concise for meme format. Be creative and appropriate for the context.
          
          Consider cultural context and humor styles that work well in ${inputData.language}.
          Use natural, conversational ${inputData.language} that native speakers would find funny.
          
          ${inputData.language === 'English' ? '' : `Remember: The captions must be in ${inputData.language}, not English!`}
        `,
      });

      console.log(`✅ Captions generated successfully in ${inputData.language}${contextualNote}`);
      return result.object;
    } catch (error) {
      console.error('Error generating captions:', error);
      throw new Error('Failed to generate captions');
    }
  },
});