import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { memeTemplateSchema, captionsSchema } from '../schemas';

// TypeScript interface for Imgflip API response
interface ImgflipApiResponse {
  success: boolean;
  error_message?: string;
  data?: {
    url: string;
    page_url: string;
  };
}

// Function to normalize Romanian special characters to ASCII equivalents
function normalizeRomanianText(text: string): string {
  const romanianCharMap: { [key: string]: string } = {
    'ă': 'a', 'Ă': 'A',
    'â': 'a', 'Â': 'A', 
    'î': 'i', 'Î': 'I',
    'ș': 's', 'Ș': 'S',
    'ț': 't', 'Ț': 'T'
  };
  
  return text.replace(/[ăĂâÂîÎșȘțȚ]/g, (char) => romanianCharMap[char] || char);
}

export const generateMemeStep = createStep({
  id: 'generate-meme',
  description: "Create a meme using Imgflip's API with normalized text (no special characters)",
  inputSchema: z.object({
    baseTemplate: memeTemplateSchema,
    captions: captionsSchema,
  }),
  outputSchema: z.object({
    imageUrl: z.string(),
    pageUrl: z.string().optional(),
    captions: z.object({
      topText: z.string(),
      bottomText: z.string(),
    }),
    baseTemplate: z.string(),
    memeStyle: z.string(),
    humorLevel: z.string(),
    analysis: z.object({
      message: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    try {
      console.log('🎨 Creating your meme...');

      const username = process.env.IMGFLIP_USERNAME || 'imgflip_hubot';
      const password = process.env.IMGFLIP_PASSWORD || 'imgflip_hubot';

      // Normalize special characters before sending to Imgflip
      const normalizedTopText = normalizeRomanianText(inputData.captions.topText);
      const normalizedBottomText = normalizeRomanianText(inputData.captions.bottomText);
      
      console.log(`📝 Original captions: "${inputData.captions.topText}" / "${inputData.captions.bottomText}"`);
      console.log(`🔄 Normalized captions: "${normalizedTopText}" / "${normalizedBottomText}"`);

      const formData = new URLSearchParams();
      formData.append('template_id', inputData.baseTemplate.id);
      formData.append('username', username);
      formData.append('password', password);
      formData.append('text0', normalizedTopText);  // Use normalized text
      formData.append('text1', normalizedBottomText);  // Use normalized text

      const response = await fetch('https://api.imgflip.com/caption_image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const result = await response.json() as ImgflipApiResponse;

      if (!result.success) {
        throw new Error(`Imgflip API error: ${result.error_message}`);
      }

      console.log('✅ Meme created successfully with normalized text!');

      return {
        imageUrl: result.data!.url,
        pageUrl: result.data!.page_url,
        captions: {
          topText: normalizedTopText,  // Return normalized text
          bottomText: normalizedBottomText,  // Return normalized text
        },
        baseTemplate: inputData.baseTemplate.name,
        memeStyle: inputData.captions.memeStyle,
        humorLevel: inputData.captions.humorLevel,
        analysis: {
          message: `Created ${inputData.captions.memeStyle} meme with ${inputData.captions.humorLevel} humor level (text normalized for image generation)`,
        },
      };
    } catch (error) {
      console.error('Error generating meme:', error);
      throw new Error('Failed to generate meme');
    }
  },
});