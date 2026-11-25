<script lang="ts">
	import { isAcquired } from '#lib/binder/binder.ts';
	import AcquiredStamp from '#lib/components/AcquiredStamp.svelte';
	import AcquiredStamps from '#lib/components/AcquiredStamps.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import { session } from '#lib/auth.svelte.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import NoteForm from '#lib/components/NoteForm.svelte';
	import NoteList from '#lib/components/NoteList.svelte';
	import { watchNotes } from '#lib/data/notes.ts';
	import { SUBJECT_TILE } from '#lib/binder/colors.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import { watchChapter, watchConcept, watchSubject } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import {
		markOpened,
		setAcquired,
		setConceptRead,
		watchConceptProgress
	} from '#lib/data/progress.ts';
	import type { ConceptRecord, SubjectColor, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline, renderMarkdown } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.concept;
	const conceptId = $derived(page.params.id ?? '');
	const conceptLive = live(
		() => session.familyId && conceptId && watchConcept(session.familyId, conceptId)
	);

	// Whose progress and notes: a signed-in child, or the parent testing as a child.
	const profileId = $derived(session.childView?.ownerId ?? null);
	const readLive = live(
		() =>
			session.familyId &&
			profileId &&
			conceptId &&
			watchConceptProgress(session.familyId, profileId, conceptId)
	);
	const isRead = $derived(readLive.data?.readAt !== undefined);
	// The parent's « Acquise » stamp (a parent testing as a child stamps their own profile).
	const acquired = $derived(isAcquired(readLive.data ?? undefined));
	const practiceBest = $derived(readLive.data?.practiceBest);
	const practiceLast = $derived(readLive.data?.practiceLast);
	const challengeBest = $derived(readLive.data?.challengeBest);

	// Opening the sheet clears its "new" / "updated" badge (again if it is re-imported while open).
	$effect(() => {
		const sheet = conceptLive.data;
		if (session.familyId && profileId && sheet) markOpened(session.familyId, profileId, sheet);
	});

	// Back link and heading: chapter title, subject name, picture and colour.
	const chapterId = $derived(conceptLive.data?.chapterId);
	const chapterLive = live(
		() => session.familyId && chapterId && watchChapter(session.familyId, chapterId)
	);
	const subjectId = $derived(conceptLive.data?.subjectId);
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId)
	);
	const color = $derived<SubjectColor>(subjectLive.data?.color ?? 'amber');

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

	function stampTest(concept: WithId<ConceptRecord>) {
		if (session.familyId && profileId) setAcquired(session.familyId, profileId, concept, !acquired);
	}

	/** Key point number (1-based) shown as a badge next to each section. */
	const keyPointNumber = $derived(
		new Map(conceptLive.data?.keyPoints.map((kp, i) => [kp.id, i + 1]) ?? [])
	);

	/** Key point id → number (1-based) of the first section that covers it. */
	const keyPointSection = $derived.by(() => {
		const first = new Map<string, number>();
		conceptLive.data?.sheet.sections.forEach((section, s) => {
			for (const kp of section.keyPoints) if (!first.has(kp)) first.set(kp, s + 1);
		});
		return first;
	});

	/** Scrolls to a section (below the sticky header) and moves the focus to it. */
	function goToSection(event: MouseEvent, n: number) {
		const target = document.getElementById(`section-${n}`);
		if (!target) return;
		event.preventDefault();
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		target.focus({ preventScroll: true });
	}
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
			<header class="flex flex-col gap-1">
				{#if subjectLive.data}
					<span class="flex min-w-0 items-center gap-2 text-sm font-bold text-base-content/60">
						<SubjectBadge subject={subjectLive.data} size={1.75} />
						<span class="truncate">
							{subjectLive.data.name}
							{#if chapterLive.data}<span aria-hidden="true">·</span> {chapterLive.data.title}{/if}
						</span>
					</span>
				{/if}
				<h1>{@html renderInline(concept.title)}</h1>
				{#if concept.tags?.length}
					<!-- Keywords; in child view each one searches « Mes fiches vues ». -->
					<ul class="flex flex-wrap gap-1.5" aria-label={t.tags}>
						{#each concept.tags as tag (tag)}
							<li>
								{#if session.childView}
									<a
										class="badge badge-outline hover:badge-primary"
										href="{resolve('/me/sheets')}?q={encodeURIComponent(tag)}"
										title={t.searchTag(tag)}
									>
										{tag}
									</a>
								{:else}
									<span class="badge badge-outline">{tag}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
				{#if profileId && (acquired || session.childView?.testing)}
					<div class="flex flex-wrap items-center gap-3 pt-1">
						{#if acquired}<AcquiredStamp {color} />{/if}
						{#if session.childView?.testing}
							<button class="btn btn-ghost btn-xs" onclick={() => stampTest(concept)}>
								{acquired ? fr.stamp.testClear : fr.stamp.testSet}
							</button>
						{/if}
					</div>
				{/if}
			</header>

			<!-- Key points are numbered: the sections below refer to them by number. -->
			<section class="card border border-primary/40 bg-primary/10">
				<div class="card-body gap-2">
					<h2 class="card-title">
						<Icon paths={UI_ICONS.bookmark} class="size-5 text-primary" />
						{t.keyPoints}
					</h2>
					<ol class="flex flex-col gap-2">
						{#each concept.keyPoints as kp, i (kp.id)}
							{@const section = keyPointSection.get(kp.id)}
							<li>
								<!-- The whole row links to the first section about this key point. -->
								{#if section}
									<a
										class="-mx-2 flex gap-3 rounded-box px-2 py-1 hover:bg-primary/10"
										href="#section-{section}"
										onclick={(event) => goToSection(event, section)}
									>
										<span class="badge badge-primary badge-sm mt-0.5 rounded-full font-bold">
											{i + 1}
										</span>
										<span>
											{@html renderInline(kp.label)}
											<span class="sr-only">{t.goToSection(section)}</span>
										</span>
									</a>
								{:else}
									<span class="flex gap-3 py-1">
										<span class="badge badge-primary badge-sm mt-0.5 rounded-full font-bold">
											{i + 1}
										</span>
										<span>{@html renderInline(kp.label)}</span>
									</span>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
			</section>

			{#each concept.sheet.sections as section, s (s)}
				<!-- Target of the key point links: kept clear of the sticky header. -->
				<section
					id="section-{s + 1}"
					tabindex="-1"
					class="card card-border scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] bg-base-100 outline-none"
				>
					<div class="card-body gap-3">
						<header class="flex items-start gap-3">
							<span
								class={[
									'grid size-10 shrink-0 place-items-center rounded-full text-lg font-bold',
									SUBJECT_TILE[color]
								]}
								aria-hidden="true"
							>
								{s + 1}
							</span>
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="text-xs font-bold tracking-wide text-base-content/50 uppercase">
									{t.section(s + 1, concept.sheet.sections.length)}
								</span>
								<h2 class="card-title">{@html renderInline(section.title)}</h2>
							</div>
							<span class="flex gap-1 pt-1">
								{#each section.keyPoints as kp (kp)}
									<span class="badge badge-primary badge-sm rounded-full font-bold">
										{keyPointNumber.get(kp)}
									</span>
								{/each}
							</span>
						</header>
						<div class="prose">{@html renderMarkdown(section.text)}</div>

						{#each section.examples as example, e (e)}
							<details class="collapse-arrow collapse border border-secondary/30 bg-secondary/5">
								<summary class="collapse-title prose flex flex-col gap-1">
									<span class="flex items-center gap-1.5 text-sm font-bold text-secondary">
										<Icon paths={UI_ICONS.lightbulb} class="size-4" />
										{t.example(e + 1)}
									</span>
									<span>{@html renderInline(example.statement)}</span>
									<span class="text-sm text-base-content/60 underline underline-offset-2">
										{t.showSolution}
									</span>
								</summary>
								<div class="collapse-content prose border-t border-dashed border-secondary/30 pt-3">
									{@html renderMarkdown(example.solution)}
								</div>
							</details>
						{/each}
					</div>
				</section>
			{/each}

			{#if concept.sheet.pitfalls.length > 0}
				<section class="card border border-warning/40 bg-warning/10">
					<div class="card-body gap-2">
						<h2 class="card-title">
							<Icon paths={UI_ICONS.alert} class="size-5 text-warning" />
							{t.pitfalls}
						</h2>
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
						<p role="status" class="alert alert-success alert-soft w-full justify-center">
							<Icon paths={UI_ICONS.check} />
							<strong>{t.isRead}</strong>
						</p>
						<button class="btn btn-ghost btn-sm" onclick={() => markRead(concept, false)}>
							{t.markUnread}
						</button>
					{:else}
						<button class="btn btn-primary btn-wide" onclick={() => markRead(concept, true)}>
							<Icon paths={UI_ICONS.check} />
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
							target={{
								conceptId: concept.id,
								chapterId: concept.chapterId,
								subjectId: concept.subjectId
							}}
						/>
						{#if conceptNotes.length > 0}
							<NoteList familyId={session.familyId} {profileId} notes={conceptNotes} mode="child" />
						{/if}
					</div>
				</section>
			{/if}

			<!-- Parent: stamp the sheet « Acquise » for each child, after checking with them. -->
			{#if session.isAdmin && !session.childView && session.familyId}
				<AcquiredStamps familyId={session.familyId} sheet={concept} />
			{/if}

			<div class="grid grid-cols-2 gap-2">
				<a
					class="btn btn-secondary h-auto min-h-12 flex-col gap-0 py-1"
					href={resolve('/concept/[id]/practice', { id: concept.id })}
				>
					<span class="flex items-center gap-1.5">
						<Icon paths={UI_ICONS.play} class="size-4" />{t.practice}
					</span>
					{#if practiceBest && practiceLast}
						<small class="font-normal opacity-80">
							{fr.practice.last(fr.practice.score(practiceLast.correct, practiceLast.total))} ·
							{fr.practice.best(fr.practice.score(practiceBest.correct, practiceBest.total))}
						</small>
					{/if}
				</a>
				<a
					class="btn h-auto min-h-12 flex-col gap-0 py-1 btn-outline btn-secondary"
					href={resolve('/concept/[id]/challenge', { id: concept.id })}
				>
					<span>{fr.challenge.title}</span>
					{#if challengeBest !== undefined}
						<small class="font-normal opacity-80">
							{fr.practice.challengeRecord(challengeBest)}
						</small>
					{/if}
				</a>
				<button class="btn col-span-2" disabled>
					{t.assessment} <small>({fr.app.soon})</small>
				</button>
			</div>
		{/snippet}
	</LoadState>
</main>
