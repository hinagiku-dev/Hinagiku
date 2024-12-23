import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Renders the given markdown string to HTML and sanitizes it.
 * @param markdown - The markdown string to be rendered.
 * @returns A promise that resolves to the sanitized HTML string.
 */
export async function renderMarkdown(markdown: string): Promise<string> {
	const renderer = new marked.Renderer();

	// prevent rendering of hidden links
	renderer.link = (token) => {
		return token.text ? `${token.text} (${token.href})` : token.href;
	};

	// prevent showing images
	renderer.image = () => '';

	const dirty = await marked(markdown, { renderer });
	return DOMPurify.sanitize(dirty);
}
