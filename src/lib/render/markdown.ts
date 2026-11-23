import DOMPurify from 'dompurify';
import katex from 'katex';
import { marked } from 'marked';

/**
 * Renders sheet content (Markdown + KaTeX) to SAFE HTML.
 * Content comes from an external AI: the final HTML is always sanitised with DOMPurify,
 * so the result can be used with {@html}.
 *
 * Math is cut out before Markdown (marked would mangle `_`, `*` and `\`), replaced by
 * alphanumeric placeholders, then rendered by KaTeX and put back.
 */
const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
const placeholder = (i: number) => `KATEXPLACEHOLDER${i}END`;
const PLACEHOLDER = /KATEXPLACEHOLDER(\d+)END/g;

function renderMath(source: string, displayMode: boolean): string {
	return katex.renderToString(source.trim(), { displayMode, throwOnError: false, output: 'html' });
}

function render(text: string, inline: boolean): string {
	const formulas: string[] = [];
	const withPlaceholders = text.replace(MATH, (_, display?: string, inlineMath?: string) => {
		formulas.push(
			display !== undefined ? renderMath(display, true) : renderMath(inlineMath!, false)
		);
		return placeholder(formulas.length - 1);
	});

	const html = inline
		? marked.parseInline(withPlaceholders, { async: false })
		: marked.parse(withPlaceholders, { async: false });

	return DOMPurify.sanitize(html.replace(PLACEHOLDER, (_, i: string) => formulas[Number(i)]));
}

/** Block content: paragraphs, lists, display math. */
export const renderMarkdown = (text: string) => render(text, false);

/** Short content (a label, an MCQ answer): no wrapping <p>. */
export const renderInline = (text: string) => render(text, true);
