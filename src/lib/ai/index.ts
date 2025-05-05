import { GoogleGeminiFlash } from './google';
import { OpenAIGpt41Mini } from './openai';

export { z } from 'zod';
export * from './google';
export * from './openai';

export const llmModel = OpenAIGpt41Mini;
export const asrModel = GoogleGeminiFlash;
