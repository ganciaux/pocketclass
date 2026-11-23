<script lang="ts">
	import 'katex/dist/katex.min.css';
	import { session } from '#lib/auth.svelte.ts';
	import { watchDoc } from '#lib/data/live.ts';
	import { conceptRef } from '#lib/data/refs.ts';
	import type { ConceptRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline, renderMarkdown } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.concept;
	const conceptId = $derived(page.params.id ?? '');

	let concept = $state<WithId<ConceptRecord> | null | undefined>(undefined);
	let failed = $state(false);

	$effect(() => {
		const familyId = session.familyId;
		if (!familyId || !conceptId) return;
		concept = undefined;
		failed = false;
		return watchDoc(
			conceptRef(familyId, conceptId),
			(doc) => (concept = doc && !doc.archived ? doc : null),
			(error) => {
				console.error('[concept]', error);
				failed = true;
			}
		);
	});

	/** Key point number (1-based) shown as a badge next to each section. */
	const keyPointNumber = $derived(new Map(concept?.keyPoints.map((kp, i) => [kp.id, i + 1]) ?? []));
</script>

<svelte:head>
	{#if concept}<title>{concept.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main class="stack">
	{#if failed}
		<p class="error">{t.loadFailed}</p>
	{:else if concept === undefined}
		<p class="muted">{fr.app.loading}</p>
	{:else if concept === null}
		<p class="error">{t.notFound}</p>
	{:else}
		<a href={resolve('/path/[id]', { id: concept.pathId })}>← {t.backToMap}</a>
		<h1>{@html renderInline(concept.title)}</h1>

		<section class="card key-points">
			<h2>{t.keyPoints}</h2>
			<ol>
				{#each concept.keyPoints as kp (kp.id)}
					<li>{@html renderInline(kp.label)}</li>
				{/each}
			</ol>
		</section>

		{#each concept.sheet.sections as section, s (s)}
			<section class="card stack sheet-section">
				<header class="row section-header">
					<h2>{@html renderInline(section.title)}</h2>
					<span class="badges">
						{#each section.keyPoints as kp (kp)}
							<span class="badge">{keyPointNumber.get(kp)}</span>
						{/each}
					</span>
				</header>
				<div class="prose">{@html renderMarkdown(section.text)}</div>

				{#if section.examples.length > 0}
					<div class="stack examples">
						<h3>{t.examples}</h3>
						{#each section.examples as example, e (e)}
							<details class="example">
								<summary>
									<span class="prose">{@html renderInline(example.statement)}</span>
									<span class="muted reveal">{t.showSolution}</span>
								</summary>
								<div class="prose solution">{@html renderMarkdown(example.solution)}</div>
							</details>
						{/each}
					</div>
				{/if}
			</section>
		{/each}

		{#if concept.sheet.pitfalls.length > 0}
			<section class="pitfalls">
				<h2>⚠️ {t.pitfalls}</h2>
				<ul>
					{#each concept.sheet.pitfalls as pitfall, p (p)}
						<li>{@html renderInline(pitfall)}</li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="actions">
			<button disabled>{t.practice} <small>({fr.app.soon})</small></button>
			<button disabled>{t.assessment} <small>({fr.app.soon})</small></button>
		</div>
	{/if}
</main>

<style>
	h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	.key-points ol {
		margin: var(--space-2) 0 0;
		padding-left: 1.4rem;
		display: grid;
		gap: var(--space-1);
	}

	.section-header {
		justify-content: space-between;
		flex-wrap: nowrap;
	}

	.badges {
		display: flex;
		gap: var(--space-1);
	}

	.badge {
		display: inline-grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		font-size: 0.75rem;
		font-weight: 700;
	}

	.prose :global(p) {
		margin: 0 0 var(--space-2);
	}

	.prose :global(.katex-display) {
		overflow-x: auto;
		overflow-y: hidden;
		padding: var(--space-1) 0;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
		color: var(--color-muted);
	}

	.example {
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
	}

	.example summary {
		display: grid;
		gap: var(--space-1);
		cursor: pointer;
	}

	.reveal {
		font-size: 0.85rem;
	}

	.example[open] .reveal {
		display: none;
	}

	.solution {
		margin-top: var(--space-2);
		padding-top: var(--space-2);
		border-top: 1px dashed var(--color-border);
	}

	.pitfalls {
		padding: var(--space-3);
		border-radius: var(--radius);
		border-left: 4px solid var(--color-warning);
		background: var(--color-warning-bg);
	}

	.pitfalls ul {
		margin: var(--space-2) 0 0;
		padding-left: 1.2rem;
		display: grid;
		gap: var(--space-1);
	}

	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2);
	}
</style>
