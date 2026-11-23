<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchConcept } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { setConceptRead, watchConceptProgress } from '#lib/data/progress.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline, renderMarkdown } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.concept;
	const conceptId = $derived(page.params.id ?? '');
	const conceptLive = live(
		() => session.familyId && conceptId && watchConcept(session.familyId, conceptId)
	);

	const profileId = $derived(session.isChild ? (session.profile?.id ?? null) : null);
	const readLive = live(
		() =>
			session.familyId &&
			profileId &&
			conceptId &&
			watchConceptProgress(session.familyId, profileId, conceptId)
	);
	const isRead = $derived(readLive.status === 'ready');

	function markRead(concept: { id: string; pathId: string }, read: boolean) {
		if (session.familyId && profileId) setConceptRead(session.familyId, profileId, concept, read);
	}

	/** Key point number (1-based) shown as a badge next to each section. */
	const keyPointNumber = $derived(
		new Map(conceptLive.data?.keyPoints.map((kp, i) => [kp.id, i + 1]) ?? [])
	);
</script>

<svelte:head>
	{#if conceptLive.data}<title>{conceptLive.data.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main class="stack">
	<LoadState source={conceptLive} notFound={t.notFound} failed={t.loadFailed}>
		{#snippet children(concept)}
			<a href={resolve('/path/[id]', { id: concept.pathId })}>{t.backToMap}</a>
			<h1>{@html renderInline(concept.title)}</h1>

			<section class="card stack">
				<h2>{t.keyPoints}</h2>
				<ol class="list">
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
				<section class="warning callout stack">
					<h2>{t.pitfalls}</h2>
					<ul class="list">
						{#each concept.sheet.pitfalls as pitfall, p (p)}
							<li>{@html renderInline(pitfall)}</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if profileId}
				<div class="stack-tight read-toggle">
					{#if isRead}
						<span class="pill success">{t.isRead}</span>
						<button class="link" onclick={() => markRead(concept, false)}>{t.markUnread}</button>
					{:else}
						<button class="primary" onclick={() => markRead(concept, true)}>{t.markRead}</button>
					{/if}
				</div>
			{/if}

			<div class="actions">
				<button disabled>{t.practice} <small>({fr.app.soon})</small></button>
				<button disabled>{t.assessment} <small>({fr.app.soon})</small></button>
			</div>
		{/snippet}
	</LoadState>
</main>

<style>
	h2 {
		margin: 0;
		font-size: 1.15rem;
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

	.read-toggle {
		align-items: center;
		text-align: center;
	}

	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2);
	}
</style>
