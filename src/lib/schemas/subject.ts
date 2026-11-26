import { z } from 'zod';
import { GRADES, SUBJECT_COLORS, SUBJECT_ICONS } from '#lib/data/types.ts';
import { chapterBodySchema, checkSheetsOf } from './chapter.ts';
import { text } from './common.ts';

/**
 * Backup / restore formats (exported by the app, re-imported as new subjects):
 * `pocketclass/subject@1` (one subject and its chapters) and `pocketclass/binder@1` (several
 * subjects). Sheet ids stay family-wide: unique across the whole document.
 */

export const SUBJECT_FORMAT = 'pocketclass/subject@1';
export const BINDER_FORMAT = 'pocketclass/binder@1';
/** Full backup (parent's profile): the binders plus every profile's data, kept as an archive. */
export const FAMILY_FORMAT = 'pocketclass/family@1';

export const subjectBodySchema = z.object({
	name: text,
	grade: z.enum(GRADES),
	color: z.enum(SUBJECT_COLORS).optional(),
	icon: z.enum(SUBJECT_ICONS).optional(),
	/** Small picture as a data URL (as stored on the subject). */
	image: z
		.string()
		.max(60000)
		.regex(/^data:image\/(webp|jpeg|png);base64,/)
		.optional(),
	chapters: z.array(chapterBodySchema)
});

export type SubjectDoc = z.infer<typeof subjectBodySchema>;

export const subjectSchema = subjectBodySchema
	.extend({ format: z.literal(SUBJECT_FORMAT), warnings: z.array(z.string()).optional() })
	.superRefine((subject, ctx) => checkSheetsOf(subject.chapters, (c) => ['chapters', c], ctx));

/** Sheet ids unique across every subject; each sheet checked (path `subjects.s.chapters.c`). */
function checkSubjects(subjects: SubjectDoc[], ctx: z.RefinementCtx) {
	const chapters = subjects.flatMap((subject, s) =>
		subject.chapters.map((chapter, c) => ({ ...chapter, path: ['subjects', s, 'chapters', c] }))
	);
	checkSheetsOf(chapters, (c) => chapters[c].path, ctx);
}

export const binderSchema = z
	.object({
		format: z.literal(BINDER_FORMAT),
		subjects: z.array(subjectBodySchema).min(1),
		warnings: z.array(z.string()).optional()
	})
	.superRefine((binder, ctx) => checkSubjects(binder.subjects, ctx));

/** Documents of a profile's sub-collection, as archived (dates as ISO text). */
const archiveRows = z.array(z.looseObject({ id: z.string() }));

/**
 * `family@1`: the binders and, per profile, its fields with its progress, notes, runs and
 * points lines. Only the binders are restored; the rest is an archive to read.
 */
export const familySchema = z
	.object({
		format: z.literal(FAMILY_FORMAT),
		exportedAt: z.string(),
		subjects: z.array(subjectBodySchema),
		profiles: z.array(
			z.looseObject({
				id: z.string(),
				firstName: z.string(),
				progress: archiveRows,
				notes: archiveRows,
				attempts: archiveRows,
				pointsLedger: archiveRows
			})
		),
		warnings: z.array(z.string()).optional()
	})
	.superRefine((family, ctx) => checkSubjects(family.subjects, ctx));

/** What the restore card accepts: one subject, a whole binder or a full backup. */
export const backupSchema = z.union([subjectSchema, binderSchema, familySchema]);

export type SubjectImport = z.infer<typeof subjectSchema>;
export type BinderImport = z.infer<typeof binderSchema>;
export type FamilyImport = z.infer<typeof familySchema>;
export type BackupImport = z.infer<typeof backupSchema>;

/** The subjects of a backup, whichever format. */
export const subjectsOf = (backup: BackupImport): SubjectDoc[] =>
	backup.format === SUBJECT_FORMAT ? [backup] : backup.subjects;
