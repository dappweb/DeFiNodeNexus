import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Genkit instance initialized with Google AI plugin.
 * Uses GEMINI_API_KEY from environment variables.
 * Includes a fallback to prevent top-level initialization crashes if the key is missing.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '',
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
