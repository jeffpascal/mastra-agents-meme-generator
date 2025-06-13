import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const analyzeImageStep = createStep({
  id: 'analyze-image',
  description: 'Analyze image from URL and create context for meme generation',
  inputSchema: z.object({
    userInput: z.string().describe('Raw user input that may contain an image URL'),
    contextualRequest: z.boolean().optional().describe('Whether this is a contextual request referencing previous content'),
    previousContext: z.string().optional().describe('Previous meme context for contextual requests'),
  }),
  outputSchema: z.object({
    hasImage: z.boolean(),
    imageUrl: z.string().optional(),
    imageDescription: z.string().optional(),
    enhancedPrompt: z.string(),
    language: z.string().describe('Detected or default language for meme generation'),
    isContextual: z.boolean().describe('Whether this was a contextual request'),
    analysis: z.object({
      message: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    try {
      console.log('🔍 Checking for image URLs and language preferences in the prompt...');

      // Handle contextual requests (like "change the language to Romanian")
      const isContextualRequest = inputData.contextualRequest || false;
      let finalPrompt = inputData.userInput;

      if (isContextualRequest && inputData.previousContext) {
        console.log('🔄 Processing contextual request with previous context...');
        finalPrompt = `${inputData.previousContext}\n\nUser's new request: ${inputData.userInput}\n\nPlease modify the previous content according to the new request.`;
      }

      // First, check for explicit language override requests
      const explicitLanguagePatterns = [
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(spanish|español)\b/i, language: 'Spanish' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(french|français)\b/i, language: 'French' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(german|deutsch)\b/i, language: 'German' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(italian|italiano)\b/i, language: 'Italian' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(portuguese|português)\b/i, language: 'Portuguese' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(romanian|română)\b/i, language: 'Romanian' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(dutch|nederlands)\b/i, language: 'Dutch' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(russian|русский)\b/i, language: 'Russian' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(chinese|中文)\b/i, language: 'Chinese' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(japanese|日本語)\b/i, language: 'Japanese' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(korean|한국어)\b/i, language: 'Korean' },
        { pattern: /\b(in|make it in|generate in|create in|change.*language.*to|switch.*to)\s+(arabic|العربية)\b/i, language: 'Arabic' },
      ];

      let detectedLanguage = null;
      
      // Check for explicit language requests first
      for (const { pattern, language } of explicitLanguagePatterns) {
        if (pattern.test(finalPrompt)) {
          detectedLanguage = language;
          console.log(`🎯 Explicit language request detected: ${detectedLanguage}`);
          break;
        }
      }

      // If no explicit language request, detect the natural language of the input
      if (!detectedLanguage) {
        try {
          const languageDetection = await generateText({
            model: openai('gpt-4o-mini'),
            messages: [
              {
                role: 'user',
                content: `Detect the language of this text and respond with ONLY the language name in English (e.g., "Spanish", "French", "German", "Romanian", etc.). If the text is clearly in English or you cannot determine the language, respond with "English".

Text to analyze: "${finalPrompt}"`,
              },
            ],
          });

          const detectedLang = languageDetection.text.trim();
          
          // Validate the detected language against supported languages
          const supportedLanguages = ['Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Romanian', 'Dutch', 'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'English'];
          
          if (supportedLanguages.includes(detectedLang)) {
            detectedLanguage = detectedLang;
            console.log(`🔍 Natural language detected: ${detectedLanguage}`);
          } else {
            detectedLanguage = 'English';
            console.log(`🔍 Language detection unclear, defaulting to: ${detectedLanguage}`);
          }
        } catch (error) {
          console.error('Language detection failed:', error);
          detectedLanguage = 'English';
          console.log(`🔍 Language detection failed, defaulting to: ${detectedLanguage}`);
        }
      }

      console.log(`🌍 Final language selection: ${detectedLanguage}${isContextualRequest ? ' (contextual request)' : ''}`);

      // Look for image URLs in the input
      const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|bmp))/gi;
      const imageUrls = finalPrompt.match(urlRegex);
      
      if (!imageUrls || imageUrls.length === 0) {
        console.log('✅ No image URLs found, proceeding with text only');
        return {
          hasImage: false,
          enhancedPrompt: finalPrompt,
          language: detectedLanguage,
          isContextual: isContextualRequest,
          analysis: {
            message: `Language: ${detectedLanguage}. ${isContextualRequest ? 'Contextual request processed. ' : ''}No image URLs detected in the input`,
          },
        };
      }

      const imageUrl = imageUrls[0]; // Use the first image URL found
      console.log(`🖼️  Found image URL: ${imageUrl}`);

      // Analyze the image with GPT-4 Vision
      const imageAnalysis = await generateText({
        model: openai('gpt-4o'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and describe what you see in detail. Focus on the emotions, context, and any text visible in the image. This will be used to create a meme, so be specific about the mood and setting. Please respond in ${detectedLanguage}.`,
              },
              {
                type: 'image',
                image: imageUrl,
              },
            ],
          },
        ],
      });

      const enhancedPrompt = `${isContextualRequest ? 'CONTEXTUAL REQUEST: ' : ''}Original text: ${finalPrompt}

Image analysis: ${imageAnalysis.text}

Create a meme that combines the text context with the visual elements from the image. Language: ${detectedLanguage}`;

      console.log('✅ Image analyzed successfully');

      return {
        hasImage: true,
        imageUrl,
        imageDescription: imageAnalysis.text,
        enhancedPrompt,
        language: detectedLanguage,
        isContextual: isContextualRequest,
        analysis: {
          message: `Language: ${detectedLanguage}. ${isContextualRequest ? 'Contextual request processed. ' : ''}Analyzed image and enhanced prompt with visual context`,
        },
      };
    } catch (error) {
      console.error('Error analyzing image:', error);
      // If image analysis fails, fallback to text-only processing
      return {
        hasImage: false,
        enhancedPrompt: inputData.userInput,
        language: 'English', // Default fallback
        isContextual: inputData.contextualRequest || false,
        analysis: {
          message: 'Image analysis failed, proceeding with text only in English',
        },
      };
    }
  },
}); 