/**
 * Markdown Rendering Utility
 * 
 * This module provides secure markdown-to-HTML conversion for the Hinagiku educational
 * platform. It processes markdown content from AI responses, user input, and educational
 * materials while maintaining security through sanitization and content filtering.
 * 
 * Security Features:
 * - DOMPurify sanitization to prevent XSS attacks
 * - Restricted HTML tag allowlist for safe content
 * - Link text exposure to prevent hidden malicious URLs
 * - Image rendering disabled to avoid external resource loading
 * - Configurable attribute filtering
 * 
 * Use Cases:
 * - AI-generated educational content formatting
 * - User-submitted content with markdown support
 * - Educational resource description rendering
 * - Safe display of collaborative discussion content
 * 
 * @fileoverview Secure markdown-to-HTML conversion with content sanitization
 */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Renders markdown content to sanitized HTML suitable for educational display.
 * 
 * This function processes markdown through a secure pipeline that:
 * 1. Configures a custom renderer with security restrictions
 * 2. Converts markdown to HTML using the marked library
 * 3. Sanitizes the HTML using DOMPurify with educational content allowlists
 * 
 * Security Measures:
 * - Links are rendered with visible URLs to prevent hidden malicious links
 * - Images are completely disabled to avoid external resource loading
 * - Only educational formatting tags are allowed (emphasis, lists, code, etc.)
 * - Custom attribute filtering for additional security control
 * 
 * @param markdown - The markdown string to be rendered and sanitized
 * @param allowedAttrs - Additional HTML attributes to allow in the sanitized output (default: none)
 * @returns A promise that resolves to the sanitized HTML string
 * 
 * @example
 * ```ts
 * // Render AI-generated educational content
 * const aiResponse = "Here's an **important concept**:\n\n1. First point\n2. Second point";
 * const html = await renderMarkdown(aiResponse);
 * // Returns: "Here's an <strong>important concept</strong>:<ol><li>First point</li><li>Second point</li></ol>"
 * ```
 * 
 * @example
 * ```ts
 * // Render content with custom allowed attributes
 * const content = "Visit [our website](https://example.com) for more info";
 * const html = await renderMarkdown(content, ['href', 'title']);
 * // Returns: "Visit our website (https://example.com) for more info"
 * ```
 */
export async function renderMarkdown(
	markdown: string,
	allowedAttrs: string[] = []
): Promise<string> {
	const renderer = new marked.Renderer();

	// Security measure: prevent rendering of hidden links by exposing URLs
	// Links are rendered as "text (url)" format to maintain transparency
	renderer.link = (token) => {
		return token.text ? `${token.text} (${token.href})` : token.href;
	};

	// Security measure: completely disable image rendering to prevent
	// external resource loading and potential privacy/security issues
	renderer.image = () => '';

	// Convert markdown to HTML using the security-configured renderer
	const dirty = await marked(markdown, { renderer });
	
	// Sanitize the HTML using DOMPurify with educational content allowlist
	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS: [
			'b',           // Bold text
			'i',           // Italic text
			'em',          // Emphasis
			'strong',      // Strong emphasis
			'code',        // Inline code
			'pre',         // Code blocks
			'p',           // Paragraphs
			'blockquote',  // Quote blocks
			'ul',          // Unordered lists
			'ol',          // Ordered lists
			'li',          // List items
			'br',          // Line breaks
			'a'            // Links (with URL exposure)
		],
		ALLOWED_ATTR: allowedAttrs
	});
}
