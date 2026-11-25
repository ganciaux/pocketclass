// Exports the JSON Schemas of the import formats to static/schemas/ (npm run schemas).
// Run directly by Node 24 (native TypeScript type stripping).
import { mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { chapterSchema } from '#lib/schemas/chapter.ts';
import { lessonSchema } from '#lib/schemas/lesson.ts';
import { sheetSchema } from '#lib/schemas/sheet.ts';
import { summarySchema } from '#lib/schemas/summary.ts';
import { binderSchema, subjectSchema } from '#lib/schemas/subject.ts';

const outDir = 'static/schemas';
const schemas = {
	sheet: sheetSchema,
	chapter: chapterSchema,
	lesson: lessonSchema,
	summary: summarySchema,
	subject: subjectSchema,
	binder: binderSchema
};

mkdirSync(outDir, { recursive: true });
for (const [name, schema] of Object.entries(schemas)) {
	// `input`: what the external AI must produce (fields with defaults are optional).
	const jsonSchema = z.toJSONSchema(schema, { io: 'input' });
	const file = `${outDir}/${name}.json`;
	writeFileSync(file, JSON.stringify(jsonSchema, null, '\t') + '\n');
	console.log(`wrote ${file}`);
}
