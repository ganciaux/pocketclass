<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { profilesAssignedTo, setPathAssignments } from '#lib/data/assignments.ts';
	import { watchPath } from '#lib/data/catalog.ts';
	import { watchChildProfiles } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import type { ImportSource } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { findConflicts, ImportConflictError, importPath } from '#lib/data/importPath.ts';
	import {
		importStats,
		nextVersion,
		type ConceptConflict,
		type ImportPlan
	} from '#lib/import/importPlan.ts';
	import { connectivity } from '#lib/online.svelte.ts';
	import { untrack } from 'svelte';
	import { parseJsonLoose } from '#lib/import/parseJsonLoose.ts';
	import { validate } from '#lib/schemas/errors.ts';
	import { pathSchema } from '#lib/schemas/path.ts';
	import { asset, resolve } from '$app/paths';

	const t = fr.import;

	let input = $state('');
	let source = $state<ImportSource>('paste');
	let selected = $state<string[]>([]);
	let importing = $state(false);
	let result = $state<{ plan: ImportPlan; pathId: string } | null>(null);
	let errorMessage = $state<string | null>(null);

	/** Parse + validate on every change: cheap, and gives instant feedback. */
	const parsed = $derived.by(() => {
		if (!input.trim()) return null;
		const json = parseJsonLoose(input);
		if (!json.ok) return { success: false as const, errors: [json.error] };
		return validate(pathSchema, json.value);
	});
	const path = $derived(parsed?.success ? parsed.data : null);
	// Primitives: what depends on them only reloads when the path really changes.
	const pathId = $derived(path?.id ?? null);

	const childrenLive = live(() => session.familyId && watchChildProfiles(session.familyId));
	const childIds = $derived((childrenLive.data ?? []).map((c) => c.id));
	const childrenReady = $derived(childrenLive.status === 'ready');
	const existingLive = live(
		() => session.familyId && pathId && watchPath(session.familyId, pathId)
	);
	const existingVersion = $derived(existingLive.data?.version ?? null);

	// Concept ids owned by other paths block the import. Checked when the path id or the concept
	// ids change (`conceptKey` is a primitive), not on every keystroke.
	const conceptKey = $derived(path ? path.concepts.map((c) => c.id).join(',') : '');
	let conflicts = $state<ConceptConflict[]>([]);
	let conflictCheckFailed = $state(false);
	$effect(() => {
		const familyId = session.familyId;
		const id = pathId;
		const current = conceptKey ? untrack(() => path) : null;
		conflicts = [];
		conflictCheckFailed = false;
		if (!familyId || !id || !current) return;
		let cancelled = false;
		findConflicts(familyId, current)
			.then((found) => !cancelled && (conflicts = found))
			.catch((error) => {
				console.error('[import] conflict check', error);
				if (!cancelled) conflictCheckFailed = true;
			});
		return () => (cancelled = true);
	});
	const canImport = $derived(
		!importing && connectivity.online && conflicts.length === 0 && !conflictCheckFailed
	);

	// Pre-tick the profiles that already have this path, once per path (cancelled if it changes).
	// Children are read untracked: a child added meanwhile must not reset the parent's ticks.
	$effect(() => {
		const familyId = session.familyId;
		const id = pathId;
		if (!familyId || !id || !childrenReady) return;
		const ids = untrack(() => childIds);
		let cancelled = false;
		profilesAssignedTo(familyId, id, ids)
			.then((assigned) => !cancelled && (selected = assigned))
			.catch((error) => console.error('[import] assignments', error));
		return () => (cancelled = true);
	});

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
		const familyId = session.familyId;
		if (!path || !familyId) return;
		importing = true;
		errorMessage = null;
		result = null;
		try {
			const plan = await importPath(familyId, path, source);
			result = { plan, pathId: path.id };
			// Two steps, two messages: a failed assignment must not look like a failed import
			// (retrying the import would bump the version again).
			try {
				await setPathAssignments(familyId, path.id, childIds, selected);
			} catch (error) {
				console.error('[import] assignments failed', error);
				errorMessage = t.assignFailed;
			}
			input = '';
		} catch (error) {
			console.error('[import] failed', error);
			if (error instanceof ImportConflictError) conflicts = error.conflicts;
			else errorMessage = t.failed;
		} finally {
			importing = false;
		}
	}
</script>

<main>
	<h1>{t.title}</h1>

	<section class="card card-border bg-base-100">
		<div class="card-body gap-3">
			<label class="fieldset">
				<span class="text-sm">{t.help}</span>
				<textarea
					class="textarea w-full resize-y font-mono text-sm"
					rows="8"
					spellcheck="false"
					placeholder={t.placeholder}
					bind:value={input}
					oninput={() => {
						source = 'paste';
						result = null;
					}}></textarea>
			</label>
			<button class="btn self-start" onclick={loadSample}>{t.loadSample}</button>
		</div>
	</section>

	{#if parsed && !parsed.success}
		<section
			role="alert"
			class="alert alert-error alert-soft flex-col items-start"
			aria-live="polite"
		>
			<strong>{t.errorsTitle}</strong>
			<ul class="list-disc space-y-1 pl-5 font-mono text-sm">
				{#each parsed.errors as error, i (i)}<li>{error}</li>{/each}
			</ul>
		</section>
	{/if}

	{#if path}
		{@const version = nextVersion(path.version, existingVersion)}
		<section class="card card-border bg-base-100">
			<div class="card-body gap-3">
				<h2 class="card-title">{t.preview(path.title)}</h2>
				<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
					<dt class="text-base-content/70">{t.subject}</dt>
					<dd>{path.subject}</dd>
					<dt class="text-base-content/70">{fr.common.grade}</dt>
					<dd>{path.grade}</dd>
					<dt class="text-base-content/70">{t.type}</dt>
					<dd>{t.types[path.type]}</dd>
					<dt class="text-base-content/70">{t.version}</dt>
					<dd>
						{existingVersion === null
							? t.versionNew(version)
							: t.versionUpdate(existingVersion, version)}
					</dd>
				</dl>

				{#each path.topics as topic (topic.id)}
					{@const concepts = path.concepts.filter((c) => c.topic === topic.id)}
					<div class="flex flex-col gap-1">
						<h3>{topic.title}</h3>
						<ul class="list-disc space-y-1 pl-5">
							{#each concepts as concept (concept.id)}
								{@const stats = importStats(concept)}
								<li>
									<strong>{concept.title}</strong>
									<span class="block text-sm text-base-content/70">
										{t.conceptLine(stats.keyPoints, stats.practice, stats.assessment)}
									</span>
								</li>
							{:else}
								<li class="text-base-content/70">{fr.common.emptyTopic}</li>
							{/each}
						</ul>
					</div>
				{/each}

				{#if path.warnings?.length}
					<div class="alert alert-warning alert-soft flex-col items-start">
						<strong>{t.warningsTitle}</strong>
						<ul class="list-disc space-y-1 pl-5">
							{#each path.warnings as warning, i (i)}<li>{warning}</li>{/each}
						</ul>
					</div>
				{/if}
			</div>
		</section>

		<section class="card card-border bg-base-100">
			<div class="card-body gap-3">
				<h2 class="card-title">{t.assignTo}</h2>
				{#each childrenLive.data ?? [] as child (child.id)}
					<label class="flex cursor-pointer items-center gap-3">
						<input
							class="checkbox checkbox-primary"
							type="checkbox"
							value={child.id}
							bind:group={selected}
						/>
						<span>{child.firstName}</span>
						<span class="badge badge-ghost badge-sm">{child.grade}</span>
					</label>
				{:else}
					<p class="text-base-content/70">{t.noChildren}</p>
				{/each}
				{#if conflicts.length > 0 || conflictCheckFailed}
					<ul
						role="alert"
						class="alert alert-error alert-soft flex-col items-start"
						aria-live="polite"
					>
						{#each conflicts as c (c.conceptId)}<li>
								{t.conflict(c.conceptId, c.ownerPathId)}
							</li>{/each}
						{#if conflictCheckFailed}<li>{t.conflictCheckFailed}</li>{/if}
					</ul>
				{/if}
				{#if !connectivity.online}<p class="alert alert-warning alert-soft">{t.offline}</p>{/if}
				<button class="btn btn-primary self-start" onclick={runImport} disabled={!canImport}>
					{importing ? t.importing : t.submit}
				</button>
			</div>
		</section>
	{/if}

	{#if errorMessage}<p role="alert" class="alert alert-error alert-soft">{errorMessage}</p>{/if}

	{#if result}
		{@const stats = result.plan.stats}
		<section class="card border-l-4 border-success bg-base-100" aria-live="polite">
			<div class="card-body gap-2">
				<p>{t.done(stats.concepts, stats.exercises)}</p>
				{#if stats.archivedConcepts || stats.archivedExercises}
					<p class="text-base-content/70">
						{t.archived(stats.archivedConcepts, stats.archivedExercises)}
					</p>
				{/if}
				<a class="btn self-start" href={resolve('/path/[id]', { id: result.pathId })}>
					{t.openPath}
				</a>
			</div>
		</section>
	{/if}
</main>
