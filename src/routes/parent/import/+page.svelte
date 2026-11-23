<script lang="ts">
	import { getDoc } from 'firebase/firestore';
	import { session } from '#lib/auth.svelte.ts';
	import { profilesAssignedTo, setPathAssignments } from '#lib/data/assignments.ts';
	import { listProfiles } from '#lib/data/family.ts';
	import { pathRef } from '#lib/data/refs.ts';
	import type { ImportSource, Profile, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { importPath } from '#lib/import/importPath.ts';
	import type { ImportPlan } from '#lib/import/importPlan.ts';
	import { parseJsonLoose } from '#lib/import/parseJsonLoose.ts';
	import { validate } from '#lib/schemas/errors.ts';
	import { pathSchema } from '#lib/schemas/path.ts';
	import { asset } from '$app/paths';

	const t = fr.import;

	let input = $state('');
	let source = $state<ImportSource>('paste');
	let children = $state<WithId<Profile>[]>([]);
	let selected = $state<string[]>([]);
	let existingVersion = $state<number | null>(null);
	let importing = $state(false);
	let result = $state<ImportPlan | null>(null);
	let errorMessage = $state<string | null>(null);

	/** Parse + validate on every change: cheap, and gives instant feedback. */
	const parsed = $derived.by(() => {
		if (!input.trim()) return null;
		const json = parseJsonLoose(input);
		if (!json.ok) return { success: false as const, errors: [json.error] };
		return validate(pathSchema, json.value);
	});
	const path = $derived(parsed?.success ? parsed.data : null);

	$effect(() => {
		if (!session.familyId || !session.isAdmin) return;
		void listProfiles(session.familyId).then((all) => {
			children = all.filter((p) => p.role === 'child');
		});
	});

	// When a valid path is pasted: read its current version and current assignments.
	$effect(() => {
		const familyId = session.familyId;
		const pathId = path?.id;
		const childIds = children.map((c) => c.id);
		existingVersion = null;
		if (!familyId || !pathId) return;
		void getDoc(pathRef(familyId, pathId)).then((snap) => {
			existingVersion = snap.exists() ? snap.data().version : null;
		});
		void profilesAssignedTo(familyId, pathId, childIds).then((ids) => (selected = ids));
	});

	const nextVersion = $derived(path ? Math.max(path.version, (existingVersion ?? 0) + 1) : 0);

	async function loadSample() {
		errorMessage = null;
		try {
			const response = await fetch(asset('samples/maths-3e-brevet.json'));
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			input = await response.text();
			source = 'sample';
			result = null;
		} catch (error) {
			console.error('[import] sample failed', error);
			errorMessage = t.sampleFailed;
		}
	}

	async function runImport() {
		if (!path || !session.familyId) return;
		importing = true;
		errorMessage = null;
		result = null;
		try {
			result = await importPath(session.familyId, path, source);
			await setPathAssignments(
				session.familyId,
				path.id,
				children.map((c) => c.id),
				selected
			);
			existingVersion = result.version;
		} catch (error) {
			console.error('[import] failed', error);
			errorMessage = t.failed;
		} finally {
			importing = false;
		}
	}

	function countBy(exercises: { usage: string }[], usage: string) {
		return exercises.filter((e) => e.usage === usage).length;
	}
</script>

<main class="stack">
	<h1>{t.title}</h1>

	{#if !session.isAdmin}
		<p class="error">{fr.parent.adminOnly}</p>
	{:else}
		<section class="card stack">
			<p class="muted">{t.help}</p>
			<textarea
				rows="8"
				spellcheck="false"
				placeholder={t.placeholder}
				bind:value={input}
				oninput={() => {
					source = 'paste';
					result = null;
				}}></textarea>
			<div class="row">
				<button onclick={loadSample}>{t.loadSample}</button>
			</div>
		</section>

		{#if parsed && !parsed.success}
			<section class="error stack" aria-live="polite">
				<strong>{t.errorsTitle}</strong>
				<ul class="errors">
					{#each parsed.errors as error, i (i)}<li>{error}</li>{/each}
				</ul>
			</section>
		{/if}

		{#if path}
			<section class="card stack">
				<h2>{t.preview} : {path.title}</h2>
				<dl class="meta">
					<dt>{t.subject}</dt>
					<dd>{path.subject}</dd>
					<dt>{t.grade}</dt>
					<dd>{path.grade}</dd>
					<dt>{t.type}</dt>
					<dd>{t.types[path.type]}</dd>
					<dt>{t.version}</dt>
					<dd>
						{existingVersion === null
							? t.versionNew(nextVersion)
							: t.versionUpdate(existingVersion, nextVersion)}
					</dd>
				</dl>

				{#each path.topics as topic (topic.id)}
					{@const concepts = path.concepts.filter((c) => c.topic === topic.id)}
					<div>
						<h3>{topic.title}</h3>
						{#if concepts.length === 0}
							<p class="muted">{t.topicEmpty}</p>
						{:else}
							<ul class="concepts">
								{#each concepts as concept (concept.id)}
									<li>
										<strong>{concept.title}</strong>
										<span class="muted">
											{t.conceptLine(
												concept.keyPoints.length,
												countBy(concept.exercises, 'practice'),
												countBy(concept.exercises, 'assessment')
											)}
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}

				{#if path.warnings?.length}
					<div class="warning">
						<strong>{t.warningsTitle}</strong>
						<ul>
							{#each path.warnings as warning, i (i)}<li>{warning}</li>{/each}
						</ul>
					</div>
				{/if}
			</section>

			<section class="card stack">
				<h2>{t.assignTo}</h2>
				{#if children.length === 0}
					<p class="muted">{t.noChildren}</p>
				{:else}
					{#each children as child (child.id)}
						<label class="check">
							<input type="checkbox" value={child.id} bind:group={selected} />
							{child.firstName} <span class="muted">({child.grade})</span>
						</label>
					{/each}
				{/if}
				<button class="primary" onclick={runImport} disabled={importing}>
					{importing ? t.importing : t.submit}
				</button>
			</section>
		{/if}

		{#if errorMessage}<p class="error">{errorMessage}</p>{/if}

		{#if result}
			<section class="card stack" aria-live="polite">
				<p>{t.done(result.stats.concepts, result.stats.exercises)}</p>
				{#if result.stats.archivedConcepts || result.stats.archivedExercises}
					<p class="muted">
						{t.archived(result.stats.archivedConcepts, result.stats.archivedExercises)}
					</p>
				{/if}
			</section>
		{/if}
	{/if}
</main>

<style>
	textarea {
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
		resize: vertical;
	}

	.errors {
		margin: 0;
		padding-left: 1.2rem;
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
	}

	.meta {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-1) var(--space-3);
		margin: 0;
	}

	.meta dt {
		color: var(--color-muted);
	}

	.meta dd {
		margin: 0;
	}

	.concepts {
		display: grid;
		gap: var(--space-2);
		margin: 0;
		padding-left: 1.2rem;
	}

	.concepts li span {
		display: block;
		font-size: 0.9rem;
	}

	.check {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 400;
	}

	.check input {
		width: auto;
		min-height: auto;
	}
</style>
