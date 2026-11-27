import { generatorsForGrade } from '#lib/generators/catalog.ts';
import { CHAPTERS_FORMAT, MAX_CHAPTERS, MIN_SHEETS_PER_CHAPTER } from '#lib/schemas/chapter.ts';
import { SHEET_FORMAT } from '#lib/schemas/sheet.ts';

/**
 * Prompts the parent copies into an external AI to get a sheet (`sheet@1`) or a whole course
 * split into chapters (`chapters@1`) back as JSON. The instructions are French content (like the sample sheets);
 * the JSON keys stay English. Pure module (unit-tested).
 */

export interface PromptContext {
	/** e.g. "Mathématiques" */
	subject: string;
	grade: string;
	chapter: string;
	group: string | null;
	/** What the parent wants (topic of the sheet, or of the chapter); may be empty. */
	request: string;
	/** Titles of the sheets already in the chapter (avoid duplicates). */
	existingTitles: string[];
	/** Sheet ids already used in the family (ids are family-wide). */
	usedIds: string[];
}

/** "maths-3e-" from "Mathématiques" and "3e": prefix suggested for new sheet ids. */
export function idPrefix(subject: string, grade: string): string {
	const slug = (value: string) =>
		value
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	return `${slug(subject).split('-')[0]}-${slug(grade)}-`;
}

const SHEET_SHAPE = `{
  "id": "<identifiant unique>",
  "title": "<titre de la fiche>",
  "tags": ["<mot-clé>", "…"],
  "prerequisites": [],
  "keyPoints": [{ "id": "kp-…", "label": "<une idée essentielle>" }],
  "mindMap": [{ "keyPoint": "kp-…", "leaves": ["<mot>", "<formule $…$>", "<piège>"] }],
  "flashcards": [{ "tag": "definition", "front": "<question courte>", "back": "<réponse en 1 ou 2 phrases>", "example": "<exemple tiré du cours>" }],
  "sheet": {
    "sections": [{
      "title": "…",
      "text": "<rappel en Markdown, formules KaTeX entre $…$ ou $$…$$>",
      "summary": ["<règle ou méthode en une ligne>", "…"],
      "examples": [{ "statement": "…", "solution": "…" }],
      "keyPoints": ["kp-…"]
    }],
    "pitfalls": ["<erreur fréquente>"]
  },
  "summaryInstruction": "<consigne pour que l'élève résume la fiche sur papier>",
  "exercises": [
    { "id": "…", "usage": "practice", "keyPoint": "kp-…", "difficulty": 1, "type": "mcq",
      "question": "…", "answer": "…", "distractors": ["…", "…", "…"],
      "explanation": "<pourquoi c'est la bonne réponse>" }
  ],
  "assessment": { "type": "test", "draw": { "perKeyPoint": 2 } }
}`;

const RULES = `Règles :
- Réponds uniquement avec le JSON, sans texte autour. Les clés JSON restent en anglais, le contenu est en français, adapté au niveau.
- Identifiants : minuscules, chiffres, « - » ou « _ » (ex. "kp-simplify", "add-1").
- "tags" : 3 à 8 mots-clés en français, en minuscules, ceux qu'un élève taperait pour retrouver la fiche (notions, vocabulaire, méthodes), sans répéter le nom de la matière.
- Les parties ("sections") sont des rappels avant les exercices, pas un cours : dans "text", 3 à 6 lignes avec les règles, la méthode et les points importants (une courte liste à puces si ça aide), sans introduction ni répétition ; assez complet pour réviser seul. "summary" : 2 à 4 puces très courtes (une ligne chacune) qui condensent la partie.
- "mindMap" : la carte mentale de la fiche, une branche par point-clé avec 1 à 4 feuilles très courtes (60 caractères au plus : un mot, une formule $…$, un exemple ou un piège), à relire d'un coup d'œil ; pas de phrase complète.
- "flashcards" : 8 à 15 cartes de révision. Recto ("front") : une question courte (une règle, une définition, un vrai ou faux). Verso ("back") : la réponse en une ou deux phrases ; "example" (facultatif) : un exemple tiré du cours. "tag" : "definition", "rule", "method", "true_false" ou "pitfall". Inclus 2 ou 3 cartes "pitfall" sur les erreurs fréquentes. Une carte = une seule idée. Vérifie l'exactitude de chaque réponse avant de l'écrire.
- 3 à 6 points-clés ("keyPoints", 8 au maximum). Chaque section, chaque exercice et chaque critère de "rubric" renvoie à un point-clé existant.
- Exercices ("exercises") : environ 4 exercices d'entraînement ("usage": "practice") par point-clé, de types variés, et au moins 2 de contrôle ("usage": "assessment") par point-clé, "difficulty" de 1 à 3. Ajoute aussi 8 à 10 "true_false" en "practice" (affirmations courtes, vraies ou fausses, pour un défi de rapidité). Chaque exercice a une "explanation" : une phrase qui explique la bonne réponse, affichée après la réponse de l'élève. Types possibles :
  - "mcq" : "question", "answer", "distractors" (exactement 3 mauvaises réponses) ;
  - "calculation" : "statement", "answer" (nombre ou fraction "a/b"), "requireIrreducible" (facultatif). Le calcul à faire est la dernière formule $…$ de l'énoncé ;
  - "cloze" : "text" avec les réponses entre [[ ]], ex. "Nous [[mangeons]]." ;
  - "true_false" : "statement", "answer" (true ou false) ;
  - "match" : "instruction" (facultatif), "pairs" (2 à 6 paires { "left", "right" } à relier, chaque texte une seule fois) ;
  - "categorize" : "instruction" (facultatif), "categories" (2 à 4), "items" ([{ "text", "category" }], "category" étant l'une des "categories") ;
  - "ordering" : "instruction", "items" (au moins 2, dans le bon ordre) ;
  - "open" : "question", "answers" (réponses courtes acceptées) ;
  - "pair" : "front", "back", "direction" ("front_to_back" ou "both") : carte à retourner ;
  - "paper" : "instruction", "answer" et "answerFormat" ("number", "fraction", "text" ou "none") facultatifs.
- "assessment" (facultatif) : "type" ("test" ou "brevet"), "draw.perKeyPoint", "exerciseIds" (ids d'exercices de la fiche), "paper" ({ "instruction", "rubric": [{ "keyPoint", "criterion" }] }).
- Relis le JSON : chaque réponse est définitive, sans hésitation ni correction (jamais « x -> non, y »).
- Si quelque chose est incertain, ajoute une phrase dans "warnings" (tableau de textes) au lieu de l'inventer.`;

/**
 * The generators of the grade: the app makes a new question at each draw (answer checked by the
 * app). Nothing when the grade has none.
 */
function generatorRules(grade: string): string {
	const generators = generatorsForGrade(grade);
	if (generators.length === 0) return '';
	const list = generators
		.map((g) => `  - "${g.id}" : ${g.label}${g.params ? ` ; "params" : ${g.params}` : ''}`)
		.join('\n');
	return `
- Exercices générés ("type": "generator") : l'application fabrique une nouvelle question à chaque tirage et vérifie la réponse elle-même. Champs : "generator" (un nom de la liste ci-dessous, aucun autre), "difficulty" (1 à 3, voir la liste), "params" (facultatif). Pour chaque point-clé qui s'y prête (calculs, conversions, équations…), ajoute 1 ou 2 générateurs en "practice", en plus des exercices écrits ; n'en mets aucun si rien ne correspond. Ils servent aussi au contrôle : chaque nouvel essai a des questions neuves. Pas de "explanation" pour eux (l'application l'écrit). Exemple : { "id": "gen-convert", "usage": "practice", "keyPoint": "kp-…", "difficulty": 2, "type": "generator", "generator": "units.length", "params": { "units": ["km", "m"] } }. Générateurs disponibles :
${list}`;
}

const rules = (grade: string) => RULES + generatorRules(grade);

function context(ctx: PromptContext): string {
	const lines = [
		`Matière : ${ctx.subject} (${ctx.grade}).`,
		`Chapitre : ${ctx.chapter}${ctx.group ? ` (partie « ${ctx.group} »)` : ''}.`
	];
	if (ctx.existingTitles.length > 0) {
		lines.push(`Fiches déjà présentes dans ce chapitre : ${ctx.existingTitles.join(' ; ')}.`);
	}
	if (ctx.usedIds.length > 0) {
		lines.push(
			`Identifiants de fiches déjà utilisés (à ne pas reprendre) : ${ctx.usedIds.join(', ')}.`
		);
	}
	return lines.join('\n');
}

const request = (ctx: { request: string }, fallback: string) => ctx.request.trim() || fallback;

/** Prompt for ONE sheet (`sheet@1`), added to the chapter. */
export function sheetPrompt(ctx: PromptContext): string {
	const prefix = idPrefix(ctx.subject, ctx.grade);
	return `Tu prépares une fiche de révision pour un élève de ${ctx.grade}, au format JSON "${SHEET_FORMAT}".

${context(ctx)}
Sujet de la fiche : ${request(ctx, '<précise ici la notion à réviser>')}.

Format attendu (un seul objet JSON) :
{ "format": "${SHEET_FORMAT}", ...une fiche }
où une fiche a cette forme :
${SHEET_SHAPE}

${rules(ctx.grade)}
- L'identifiant de la fiche commence par "${prefix}" (ex. "${prefix}fractions").`;
}

/** What the course prompt knows of the subject. */
export interface CourseContext {
	subject: string;
	grade: string;
	/** What the parent wants (themes, notions; often « see the attached photos »); may be empty. */
	request: string;
	/** The subject's chapters already there (no duplicate), with their group if any. */
	existingChapters: { title: string; group: string | null }[];
	/** Sheet ids already used in the family (ids are family-wide). */
	usedIds: string[];
}

function courseContext(ctx: CourseContext): string {
	const lines = [`Matière : ${ctx.subject} (${ctx.grade}).`];
	if (ctx.existingChapters.length > 0) {
		const titles = ctx.existingChapters.map((c) => (c.group ? `${c.title} (${c.group})` : c.title));
		lines.push(
			`Chapitres déjà présents dans cette matière (à ne pas refaire) : ${titles.join(' ; ')}.`
		);
		const groups = [...new Set(ctx.existingChapters.flatMap((c) => (c.group ? [c.group] : [])))];
		if (groups.length > 0)
			lines.push(`Parties déjà utilisées pour "group" : ${groups.join(' ; ')}.`);
	}
	if (ctx.usedIds.length > 0) {
		lines.push(
			`Identifiants de fiches déjà utilisés (à ne pas reprendre) : ${ctx.usedIds.join(', ')}.`
		);
	}
	return lines.join('\n');
}

/**
 * Prompt for a course (`chapters@1`): the AI splits it into chapters, one per big theme, each
 * with its own sheets, and avoids thin chapters.
 */
export function coursePrompt(ctx: CourseContext): string {
	const prefix = idPrefix(ctx.subject, ctx.grade);
	return `Tu prépares des fiches de révision pour un élève de ${ctx.grade}, à partir d'un cours (par exemple les photos du cahier jointes), au format JSON "${CHAPTERS_FORMAT}".

${courseContext(ctx)}
Contenu du cours : ${request(ctx, '<précise ici les thèmes et notions, ou joins les photos du cours>')}.

Format attendu (un seul objet JSON) :
{ "format": "${CHAPTERS_FORMAT}", "chapters": [ { "title": "<titre du chapitre>", "group": "<partie, facultatif>", "sheets": [ ...des fiches ] } ] }
où chaque fiche a cette forme :
${SHEET_SHAPE}

Découpage en chapitres :
- Un chapitre = un grand thème du cours (souvent un titre du cahier : un thème, une « unit », une leçon), avec ses propres fiches. Ne mets jamais plusieurs thèmes dans un même chapitre « fourre-tout », et n'écris jamais un titre comme « Thème 1 + Thème 2 ».
- Évite les chapitres trop maigres : au moins ${MIN_SHEETS_PER_CHAPTER} fiches par chapitre. Un petit thème qui ne donnerait qu'une fiche rejoint le chapitre du thème le plus proche. Si tout le cours ne forme qu'un thème, fais un seul chapitre.
- ${MAX_CHAPTERS} chapitres au plus, dans l'ordre du cours ; dans chaque chapitre, une fiche par notion, dans l'ordre où l'élève doit les réviser.
- "title" : court et parlant, il dit de quoi parle le chapitre (ex. « Le prétérit », pas « Thème 2 »). "group" (facultatif) : la partie qui regroupe des chapitres voisins (ex. « Grammaire », « Vocabulaire ») ; reprends une partie existante quand elle convient.

${rules(ctx.grade)}
- Les identifiants des fiches sont uniques dans tout le JSON et commencent par "${prefix}".`;
}
