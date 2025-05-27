import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Renders the given markdown string to HTML and sanitizes it.
 * @param markdown - The markdown string to be rendered.
 * @param allowedAttrs - An array of allowed HTML attributes in the rendered HTML. Defaults to no allowed attributes.
 * @returns A promise that resolves to the sanitized HTML string.
 */
export async function renderMarkdown(
	markdown: string,
	allowedAttrs: string[] = []
): Promise<string> {
	const renderer = new marked.Renderer();

	// prevent rendering of hidden links
	renderer.link = (token) => {
		return token.text ? `${token.text} (${token.href})` : token.href;
	};

	// prevent showing images
	renderer.image = () => '';

	const dirty = await marked(markdown, { renderer });
	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS: [
			'b',
			'i',
			'em',
			'strong',
			'code',
			'pre',
			'p',
			'blockquote',
			'ul',
			'ol',
			'li',
			'br',
			'a'
		],
		ALLOWED_ATTR: allowedAttrs
	});
}
