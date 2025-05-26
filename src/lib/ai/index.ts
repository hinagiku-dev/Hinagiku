import { GoogleGeminiFlash } from './google';
import { OpenAIGpt41Mini } from './openai';

export { z } from 'zod';
export * from './google';
export * from './openai';

export const chatModel = OpenAIGpt41Mini;
export const pdfModel = GoogleGeminiFlash;
export const asrModel = GoogleGeminiFlash;
