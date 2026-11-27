import { z } from 'zod';
import { splitNames, POINT_NAME } from '#lib/figures/names.ts';
import { fr } from '#lib/i18n/fr.ts';
import { slug, text } from './common.ts';

/**
 * Geometry figure of a sheet (written by the AI, drawn by the app: `figures/layout.ts`). The AI
 * describes it, it does not draw: points with coordinates, segments (« AB »), right angles
 * (« BAC », vertex in the middle) and length labels. Checked at import: every name is a point
 * of the figure, a right angle really is one. No nested arrays (Firestore refuses them).
 */

const coordinate = z.number().min(-20).max(20);

export const figureSchema = z
	.object({
		id: slug,
		points: z
			.record(z.string().regex(POINT_NAME), z.tuple([coordinate, coordinate]))
			.refine((points) => Object.keys(points).length >= 2 && Object.keys(points).length <= 12, {
				error: fr.validation.figurePoints
			}),
		segments: z.array(z.string()).max(20).default([]),
		rightAngles: z.array(z.string()).max(6).default([]),
		labels: z
			.array(z.object({ on: z.string(), text: text.max(20) }))
			.max(12)
			.default([]),
		caption: text.max(120).optional()
	})
	.superRefine((figure, ctx) => {
		const points = figure.points;
		/** The names of `value` if it is `count` points of the figure, else an issue. */
		const pointsOf = (value: string, count: number, path: (string | number)[]) => {
			const names = splitNames(value);
			const unknown = names?.find((n) => !(n in points));
			if (!names || names.length !== count || new Set(names).size !== count || unknown) {
				ctx.addIssue({ code: 'custom', path, message: fr.validation.figureNames(value, count) });
				return null;
			}
			return names;
		};
		figure.segments.forEach((s, i) => pointsOf(s, 2, ['segments', i]));
		figure.labels.forEach((l, i) => pointsOf(l.on, 2, ['labels', i, 'on']));
		figure.rightAngles.forEach((angle, i) => {
			const names = pointsOf(angle, 3, ['rightAngles', i]);
			if (!names) return;
			const [a, o, b] = names.map((n) => points[n]);
			const u = [a[0] - o[0], a[1] - o[1]];
			const v = [b[0] - o[0], b[1] - o[1]];
			const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
			// About 1°: the AI placed the points for a right angle, or it is not one.
			if (Math.abs(cos) > 0.02) {
				ctx.addIssue({
					code: 'custom',
					path: ['rightAngles', i],
					message: fr.validation.notRightAngle(angle)
				});
			}
		});
	});

export type Figure = z.infer<typeof figureSchema>;

/** Figures of a sheet: at most 10. */
export const figuresSchema = z.array(figureSchema).max(10);

/** Optional reference from a section, an example or an exercise to one of the sheet's figures. */
export const figureRef = slug.optional();
