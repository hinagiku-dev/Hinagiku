/**
 * OpenAI Integration Module
 * 
 * This module configures and exports the OpenAI GPT-4 Mini model integration
 * for the Hinagiku educational platform. GPT-4 Mini provides an optimal balance
 * of performance, cost efficiency, and educational appropriateness for student
 * interactions and learning guidance.
 * 
 * Features:
 * - Conversational AI for student support and tutoring
 * - Educational content generation and explanation
 * - Learning progress assessment and feedback
 * - Multi-language support for diverse educational contexts
 * 
 * The integration uses the Genkit framework for standardized AI model interactions
 * and is configured with environment-based API key management for security.
 * 
 * @fileoverview OpenAI GPT-4 Mini model integration for educational AI interactions
 */

import { env } from '$env/dynamic/private';
import { genkit } from 'genkit';
import { gpt41Mini, openAI } from 'genkitx-openai';

/**
 * OpenAI GPT-4 Mini model instance configured for educational use.
 * 
 * This model is optimized for:
 * - Student-teacher interactions and tutoring
 * - Educational content explanation and clarification
 * - Learning objective assessment and guidance
 * - Pedagogically appropriate response generation
 * 
 * The model uses the OpenAI API with secure key management and
 * follows educational best practices for AI-assisted learning.
 */
export const OpenAIGpt41Mini = genkit({
	plugins: [openAI({ apiKey: env.OPENAI_API_KEY })],
	model: gpt41Mini
});
