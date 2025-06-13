import { z } from 'zod';

export const captionsSchema = z.object({
  topText: z.string().describe('Text for the top of the meme'),
  bottomText: z.string().describe('Text for the bottom of the meme'),
  memeStyle: z
    .string()
    .describe('The style of humor to use (e.g., witty, sarcastic, relatable, exaggerated, deadpan, reaction, observational, etc.)'),
  humorLevel: z
    .string()
    .describe('How edgy the humor should be (e.g., mild, medium, spicy, family-friendly, edgy, etc.)'),
});