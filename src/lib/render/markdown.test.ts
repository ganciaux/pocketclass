// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderInline, renderMarkdown } from './markdown.ts';

function toDom(html: string): HTMLElement {
	const div = document.createElement('div');
	div.innerHTML = html;
	return div;
}

describe('renderMarkdown', () => {
	it('renders Markdown', () => {
		const html = renderMarkdown('Un **mot** important.\n\n- a\n- b');
		expect(html).toContain('<strong>mot</strong>');
		expect(html).toContain('<li>a</li>');
	});

	it('renders inline and display math with KaTeX, untouched by Markdown', () => {
		const html = renderMarkdown('On a $a_1 * b_2$ et\n\n$$\\frac{12}{18} = \\frac{2}{3}$$');
		expect(html).toContain('class="katex"');
		expect(html).toContain('katex-display');
		expect(html).not.toContain('<em>');
		expect(html).not.toContain('KATEXPLACEHOLDER');
	});

	it('does not throw on invalid LaTeX', () => {
		expect(() => renderMarkdown('$\\frac{1}{$')).not.toThrow();
	});

	it('removes scripts, event handlers and javascript: links', () => {
		const dom = toDom(
			renderMarkdown(
				'<script>alert(1)</script><img src=x onerror="alert(1)">\n\n[lien](javascript:alert(1))\n\n<a href="javascript:alert(1)">a</a>'
			)
		);
		expect(dom.querySelector('script')).toBeNull();
		expect(dom.querySelector('[onerror]')).toBeNull();
		const hrefs = [...dom.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
		expect(hrefs.some((h) => h.startsWith('javascript:'))).toBe(false);
	});

	it('keeps HTML smuggled inside math as inert text', () => {
		const dom = toDom(renderMarkdown('$\\text{<img src=x onerror=alert(1)>}$'));
		expect(dom.querySelector('img')).toBeNull();
		expect(dom.querySelector('[onerror]')).toBeNull();
	});
});

describe('renderInline', () => {
	it('does not wrap in a paragraph', () => {
		const html = renderInline('$\\frac{2}{3}$');
		expect(html.startsWith('<p>')).toBe(false);
		expect(html).toContain('katex');
	});
});
