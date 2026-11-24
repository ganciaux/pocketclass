<script lang="ts">
	import BackLink from '#lib/components/BackLink.svelte';
	import { session } from '#lib/auth.svelte.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import NoteForm from '#lib/components/NoteForm.svelte';
	import NoteList from '#lib/components/NoteList.svelte';
	import { watchNotes } from '#lib/data/notes.ts';
	import { watchChapter, watchConcept } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { markOpened, setConceptRead, watchConceptProgress } from '#lib/data/progress.ts';
	import type { ConceptRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline, renderMarkdown } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.concept;
	const conceptId = $derived(page.params.id ?? '');
	const conceptLive = live(
		() => session.familyId && conceptId && watchConcept(session.familyId, conceptId)
	);

	const profileId = $derived(session.childId);
	const readLive = live(
		() =>
			session.familyId &&
			profileId &&
			conceptId &&
			watchConceptProgress(session.familyId, profileId, conceptId)
	);
	const isRead = $derived(readLive.data?.readAt !== undefined);

	// Opening the sheet clears its "new" / "updated" badge (again if it is re-imported while open).
	$effect(() => {
		const sheet = conceptLive.data;
		if (session.familyId && profileId && sheet) markOpened(session.familyId, profileId, sheet);
	});

	// For the back link only.
	const chapterId = $derived(conceptLive.data?.chapterId);
	const chapterLive = live(
		() => session.familyId && chapterId && watchChapter(session.familyId, chapterId)
	);

	// The profile's notes, filtered to this sheet (one listener, cached for "My notes" too).
	const notesLive = live(
		() => session.familyId && profileId && watchNotes(session.familyId, profileId)
	);
	const conceptNotes = $derived(
		(notesLive.data ?? []).filter((n) => n.conceptId === conceptId && !n.exerciseId)
	);

	function markRead(concept: WithId<ConceptRecord>, read: boolean) {
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

<main>
	<LoadState source={conceptLive} notFound={t.notFound} failed={t.loadFailed}>
		{#snippet children(concept)}
			<BackLink
				href={resolve('/chapter/[id]', { id: concept.chapterId })}
				label={chapterLive.data?.title ?? fr.binder.chapter}
			/>
			<h1>{@html renderInline(concept.title)}</h1>

			<!-- Key points are numbered: the sections below refer to them by number. -->
			<section class="card border-l-4 border-primary bg-base-100">
				<div class="card-body gap-2">
					<h2 class="card-title">{t.keyPoints}</h2>
					<ol class="flex flex-col gap-2">
						{#each concept.keyPoints as kp, i (kp.id)}
							<li class="flex gap-3">
								<span class="badge badge-primary badge-sm mt-0.5 rounded-full font-bold">
									{i + 1}
								</span>
								<span>{@html renderInline(kp.label)}</span>
							</li>
						{/each}
					</ol>
				</div>
			</section>

			{#each concept.sheet.sections as section, s (s)}
				<section class="card card-border bg-base-100">
					<div class="card-body gap-3">
						<header class="flex items-start justify-between gap-2">
							<h2 class="card-title">{@html renderInline(section.title)}</h2>
							<span class="flex gap-1">
								{#each section.keyPoints as kp (kp)}
									<span class="badge badge-primary badge-sm rounded-full font-bold">
										{keyPointNumber.get(kp)}
									</span>
								{/each}
							</span>
						</header>
						<div class="prose">{@html renderMarkdown(section.text)}</div>

						{#if section.examples.length > 0}
							<div class="flex flex-col gap-2">
								<h3 class="text-base-content/70">{t.examples}</h3>
								{#each section.examples as example, e (e)}
									<details class="collapse-arrow collapse border border-base-300 bg-base-200/50">
										<summary class="collapse-title prose">
											{@html renderInline(example.statement)}
											<span class="block text-sm text-secondary">{t.showSolution}</span>
										</summary>
										<div class="collapse-content prose border-t border-dashed border-base-300 pt-3">
											{@html renderMarkdown(example.solution)}
										</div>
									</details>
								{/each}
							</div>
						{/if}
					</div>
				</section>
			{/each}

			{#if concept.sheet.pitfalls.length > 0}
				<section class="card border-l-4 border-warning bg-warning/15">
					<div class="card-body gap-2">
						<h2 class="card-title">{t.pitfalls}</h2>
						<ul class="list-disc space-y-1 pl-5">
							{#each concept.sheet.pitfalls as pitfall, p (p)}
								<li>{@html renderInline(pitfall)}</li>
							{/each}
						</ul>
					</div>
				</section>
			{/if}

			{#if profileId}
				<div class="flex flex-col items-center gap-1">
					{#if isRead}
						<span class="badge badge-success badge-lg">{t.isRead}</span>
						<button class="btn btn-ghost btn-sm" onclick={() => markRead(concept, false)}>
							{t.markUnread}
						</button>
					{:else}
						<button class="btn btn-primary btn-wide" onclick={() => markRead(concept, true)}>
							{t.markRead}
						</button>
					{/if}
				</div>
			{/if}

			{#if profileId && session.familyId}
				<section class="card card-border bg-base-100">
					<div class="card-body gap-3">
						<h2 class="card-title">{fr.notes.formTitle}</h2>
						<NoteForm
							familyId={session.familyId}
							{profileId}
							target={{ conceptId: concept.id, chapterId: concept.chapterId }}
						/>
						{#if conceptNotes.length > 0}
							<NoteList familyId={session.familyId} {profileId} notes={conceptNotes} mode="child" />
						{/if}
					</div>
				</section>
			{/if}

			<div class="grid grid-cols-2 gap-2">
				<button class="btn" disabled>{t.practice} <small>({fr.app.soon})</small></button>
				<button class="btn" disabled>{t.assessment} <small>({fr.app.soon})</small></button>
			</div>
		{/snippet}
	</LoadState>
</main>
