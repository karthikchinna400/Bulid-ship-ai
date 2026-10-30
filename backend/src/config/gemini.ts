import { GoogleGenAI } from '@google/genai';
import { env } from './env';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required');
}

export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const GEMINI_MODEL = env.GEMINI_MODEL;

