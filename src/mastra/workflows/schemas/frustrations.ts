import { z } from 'zod';

export const contentAnalysisSchema = z.object({
  themes: z.array(
    z.object({
      text: z.string().describe('The specific theme or topic mentioned'),
      category: z
        .string()
        .describe('Category of the theme (e.g., humor, frustration, excitement, relationships, lifestyle, technology, etc.)'),
      intensity: z
        .string()
        .describe('How intense this theme is (e.g., low, medium, high, subtle, overwhelming, etc.)'),
      keywords: z
        .array(z.string())
        .describe('Key words that could be used for meme search'),
    }),
  ),
  overallMood: z
    .string()
    .describe('Overall emotional tone (e.g., happy, sad, frustrated, excited, confused, nostalgic, etc.)'),
  suggestedMemeStyle: z
    .string()
    .describe('Suggested meme style based on content (e.g., classic, reaction, drake-pointing, expanding-brain, etc.)'),
});

// Keep the old export for backward compatibility
export const frustrationsSchema = contentAnalysisSchema;