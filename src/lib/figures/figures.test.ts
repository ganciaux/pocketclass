import { describe, expect, it } from 'vitest';
import { validate } from '#lib/schemas/errors.ts';
import { figureSchema, type Figure } from '#lib/schemas/figure.ts';
import { layoutFigure } from './layout.ts';
import { splitNames } from './names.ts';

/** Triangle ABC right-angled at A, AB = 4, AC = 3. */
const triangle = {
	id: 'fig-abc',
	points: { A: [0, 0], B: [4, 0], C: [0, 3] },
	segments: ['AB', 'BC', 'CA'],
	rightAngles: ['BAC'],
	labels: [
		{ on: 'AB', text: '4 cm' },
		{ on: 'AC', text: '3 cm' }
	]
};

const errorsOf = (data: unknown) => {
	const result = validate(figureSchema, data);
	return result.success ? [] : result.errors;
};

describe('splitNames', () => {
	it('reads point names as in a school book', () => {
		expect(splitNames('AB')).toEqual(['A', 'B']);
		expect(splitNames("A'B'")).toEqual(["A'", "B'"]);
		expect(splitNames('O1M')).toEqual(['O1', 'M']);
		expect(splitNames('ab')).toBeNull();
		expect(splitNames('A B')).toBeNull();
	});
});

describe('figureSchema', () => {
	it('accepts a right triangle with its lengths', () => {
		expect(errorsOf(triangle)).toEqual([]);
	});

	it('refuses an angle said right that is not', () => {
		const errors = errorsOf({ ...triangle, rightAngles: ['ABC'] });
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatch(/^rightAngles\[0\] : /);
	});

	it('refuses names that are not points of the figure, or the wrong number of them', () => {
		const errors = errorsOf({
			...triangle,
			segments: ['AD', 'ABC'],
			labels: [{ on: 'AA', text: 'x' }]
		});
		expect(errors.map((e) => e.split(' : ')[0])).toEqual([
			'segments[0]',
			'segments[1]',
			'labels[0].on'
		]);
	});

	it('refuses a point name that is not a capital letter', () => {
		expect(errorsOf({ ...triangle, points: { a: [0, 0], B: [1, 0] } })).not.toEqual([]);
	});
});

describe('layoutFigure', () => {
	const layout = layoutFigure(figureSchema.parse(triangle) as Figure);

	it('scales the figure, y going down', () => {
		// 40 px per unit: A (0, 0) is 3 units below C (0, 3).
		const a = layout.points.find((p) => p.name === 'A');
		const c = layout.points.find((p) => p.name === 'C');
		expect([a?.x, a?.y]).toEqual([28, 148]);
		expect([c?.x, c?.y]).toEqual([28, 28]);
	});

	it('frames everything drawn, the labels on the left included', () => {
		const [left, , width] = layout.viewBox.split(' ').map(Number);
		const ac = layout.labels.find((l) => l.text === '3 cm')!;
		// AC is the left side: its label ends left of it, inside the frame.
		expect(ac.anchor).toBe('end');
		expect(ac.x - '3 cm'.length * 7.5).toBeGreaterThanOrEqual(left);
		expect(left + width).toBeGreaterThan(188);
	});

	it('puts point names outside the figure', () => {
		const a = layout.points.find((p) => p.name === 'A');
		// A is the bottom-left corner: its name goes further left and down.
		expect(a!.nameX).toBeLessThan(a!.x);
		expect(a!.nameY).toBeGreaterThan(a!.y);
	});

	it('draws the right angle at A inside the triangle', () => {
		expect(layout.rightAngles).toEqual(['M38 148L38 138L28 138']);
	});

	it('puts a length label outside, beside the middle of its segment', () => {
		const ab = layout.labels.find((l) => l.text === '4 cm');
		// AB is the bottom side (y = 148): its label goes below.
		expect(ab?.x).toBe(108);
		expect(ab!.y).toBeGreaterThan(148);
	});
});
