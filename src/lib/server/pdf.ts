/**
 * PDF Processing Module
 * 
 * This module provides PDF document parsing and text extraction capabilities for
 * the Hinagiku educational platform. It uses AI-powered document understanding
 * to convert PDF files into structured markdown text that can be used as
 * educational resources in learning sessions.
 * 
 * Key Features:
 * - AI-powered PDF text extraction using Google Gemini
 * - Conversion to markdown format for consistent text handling
 * - Support for complex document layouts and formatting
 * - Error handling and graceful degradation
 * - Base64 encoding for secure document transmission
 * 
 * Educational Context:
 * Enables teachers to upload PDF documents (textbooks, articles, assignments)
 * that are automatically processed and made available as searchable text resources
 * for AI-assisted learning conversations and group discussions.
 * 
 * @fileoverview PDF document processing and text extraction for educational resources
 */

// Legacy import for potential future use with traditional PDF parsing
// import pdf from 'pdf-parse';
import { pdfModel, z } from '$lib/ai';
import { PDF_PARSE_PROMPT } from './prompt';

// Legacy function using LlamaParse - kept for reference
// export async function pdf2Text(fileBuffer: ArrayBuffer, apiKey: string): Promise<string | null> {
// 	try {
// 		const parser = new LlamaParse(apiKey);
// 		const result = await parser.parseFile(new Blob([fileBuffer]));
// 		return result.markdown;
// 	} catch (error) {
// 		console.error('Error in pdf2Text', error);
// 		return null;
// 	}
// }

/**
 * Converts PDF document content to structured markdown text using AI processing.
 * 
 * This function leverages Google Gemini's multimodal capabilities to understand
 * PDF document structure and extract text content in a standardized markdown format.
 * The AI model can handle complex layouts, tables, images, and formatting that
 * traditional text extraction tools might miss.
 * 
 * Process:
 * 1. Convert PDF buffer to base64 for AI model input
 * 2. Send to Gemini with specialized PDF parsing prompt
 * 3. Receive structured markdown output with schema validation
 * 4. Return processed text or null on failure
 * 
 * AI Configuration:
 * - Low temperature (0.1) for consistent, accurate text extraction
 * - Structured output schema to ensure valid markdown format
 * - System prompt optimized for educational content processing
 * 
 * @param fileBuffer - Binary PDF file data as ArrayBuffer
 * @returns Promise resolving to markdown text or null if processing fails
 * 
 * @example
 * ```ts
 * // Process uploaded PDF file
 * const pdfBuffer = await file.arrayBuffer();
 * const markdownContent = await pdf2Text(pdfBuffer);
 * 
 * if (markdownContent) {
 *   // Use extracted text as educational resource
 *   console.log('Extracted content:', markdownContent);
 * } else {
 *   console.error('Failed to process PDF');
 * }
 * ```
 */
export async function pdf2Text(fileBuffer: ArrayBuffer): Promise<string | null> {
	try {
		// Use AI model to extract and structure PDF content
		const { output } = await pdfModel.generate({
			// Specialized prompt for PDF text extraction
			system: PDF_PARSE_PROMPT,
			
			// PDF content as base64-encoded media input
			prompt: [
				{
					media: {
						url: `data:application/pdf;base64,${Buffer.from(fileBuffer).toString('base64')}`
					}
				}
			],
			
			// Structured output validation
			output: {
				schema: z.object({
					markdown: z.string()
				})
			},
			
			// Low temperature for consistent, accurate extraction
			config: { temperature: 0.1 }
		});

		// Validate AI response
		if (!output) {
			throw new Error('Failed to parse PDF');
		}

		return output.markdown;
	} catch (error) {
		console.error('Error in pdf2Text', error);
		return null;
	}
}
