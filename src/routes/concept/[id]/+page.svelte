<script lang="ts">
	import SheetView from '#lib/components/SheetView.svelte';
	import RevisionHourglass from '#lib/components/RevisionHourglass.svelte';
	import ExportButton from '#lib/components/ExportButton.svelte';
	import { exportSheet } from '#lib/data/catalogExport.ts';
	import { exportFileName } from '#lib/import/catalogExport.ts';
	import { isAcquired, isRead as readOf, sheetPosition } from '#lib/binder/binder.ts';
	import AcquiredStamp from '#lib/components/AcquiredStamp.svelte';
	import AcquiredStamps from '#lib/components/AcquiredStamps.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import FailedStamp from '#lib/components/FailedStamp.svelte';
	import AssessmentSettings from '#lib/components/AssessmentSettings.svelte';
	import { assessmentStatus } from '#lib/practice/assessment.ts';
	import { session } from '#lib/auth.svelte.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import NoteForm from '#lib/components/NoteForm.svelte';
	import NoteList from '#lib/components/NoteList.svelte';
	import { watchNotes } from '#lib/data/notes.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import { SUBJECT_TEXT } from '#lib/binder/colors.ts';
	import Icon from '#lib/components/Icon.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import { watchChapter, watchConcept, watchSheetsOf, watchSubject } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import {
		markOpened,
		setAcquired,
		setConceptRead,
		watchConceptProgress
	} from '#lib/data/progress.ts';
	import type { ConceptRecord, SubjectColor, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.concept;
	const conceptId = $derived(page.params.id ?? '');
	const conceptLive = live(
		() => session.familyId && conceptId && watchConcept(session.familyId, conceptId)
	);

	// Whose progress and notes: a signed-in child, or the parent testing as a child.
	const profileId = $derived(session.ownerId);
	const readLive = live(
		() =>
			session.familyId &&
			profileId &&
			conceptId &&
			watchConceptProgress(session.familyId, profileId, conceptId)
	);
	// An acquired sheet counts as read (no need to mark it by hand).
	const isRead = $derived(readOf(readLive.data ?? undefined));
	// The parent's « Acquise » stamp (a parent testing as a child stamps their own profile).
	const acquired = $derived(isAcquired(readLive.data ?? undefined));
	const practiceBest = $derived(readLive.data?.practiceBest);
	const practiceLast = $derived(readLive.data?.practiceLast);
	const challengeBest = $derived(readLive.data?.challengeBest);
	const assessment = $derived(assessmentStatus(readLive.data));

	// Opening the sheet clears its "new" / "updated" badge (again if it is re-imported while open).
	// The visit is counted once per sheet shown (statistics), not on each catalogue update.
	let counted = '';
	$effect(() => {
		const sheet = conceptLive.data;
		if (!session.familyId || !profileId || !sheet) return;
		const visit = `${profileId}/${sheet.id}`;
		markOpened(session.familyId, profileId, sheet, visit !== counted);
		counted = visit;
	});

	// Back link and heading: chapter title, subject name, picture and colour.
	const chapterId = $derived(conceptLive.data?.chapterId);
	const chapterLive = live(
		() => session.familyId && chapterId && watchChapter(session.familyId, chapterId)
	);
	// Place in the chapter (« 3 / 6 ») and the next sheet.
	const chapterSheetsLive = live(
		() => session.familyId && chapterId && watchSheetsOf(session.familyId, chapterId)
	);
	const place = $derived(
		chapterSheetsLive.data ? sheetPosition(chapterSheetsLive.data, conceptId) : null
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
</script>

<svelte:head>
	{#if conceptLive.data}<title>{conceptLive.data.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	<LoadState source={conceptLive} notFound={t.notFound} failed={t.loadFailed}>
		{#snippet children(concept)}
			<div class="flex items-center justify-between gap-3">
				<BackLink
					href={resolve('/chapter/[id]', { id: concept.chapterId })}
					label={chapterLive.data?.title ?? fr.binder.chapter}
				/>
				{#if place}
					<!-- Where this sheet stands in its chapter, as a ring in the subject's ink. -->
					<div
						class={[
							'radial-progress shrink-0 bg-base-100 text-xs font-bold shadow-[inset_0_0_0_4px_var(--color-base-300)]',
							SUBJECT_TEXT[color]
						]}
						style:--value={(place.position / place.total) * 100}
						style:--size="2.75rem"
						style:--thickness="4px"
						role="img"
						aria-label={t.position(place.position, place.total)}
						title={t.position(place.position, place.total)}
					>
						<span class="text-base-content">{place.position}/{place.total}</span>
					</div>
				{/if}
			</div>
			<header class="flex flex-col gap-1">
				{#if subjectLive.data}
					<span class="flex min-w-0 items-center gap-2 text-sm font-bold text-base-content/60">
						<a
							class="link-icon"
							href={resolve('/subject/[id]', { id: subjectLive.data.id })}
							title={subjectLive.data.name}
							aria-label={subjectLive.data.name}
						>
							<SubjectBadge subject={subjectLive.data} size={1.75} />
						</a>
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
				{#if profileId && (acquired || assessment.failed || session.childView?.testing)}
					<div class="flex flex-wrap items-center gap-3 pt-1">
						{#if acquired}<AcquiredStamp />{/if}
						{#if assessment.failed}<FailedStamp />{/if}
						{#if session.childView?.testing}
							<button class="btn btn-ghost btn-xs" onclick={() => stampTest(concept)}>
								{acquired ? fr.stamp.testClear : fr.stamp.testSet}
							</button>
						{/if}
					</div>
				{/if}
			</header>

			<SheetView keyPoints={concept.keyPoints} sheet={concept.sheet} {color} />

			<!-- The end of the sheet: « J'ai lu cette fiche », and on to the next one of the chapter. -->
			{#if profileId || place?.next}
				<div class="flex flex-col items-center gap-2">
					{#if profileId && isRead}
						<p role="status" class="alert alert-success alert-soft w-full justify-center">
							<Icon paths={UI_ICONS.check} />
							<strong>{t.isRead}</strong>
						</p>
					{/if}
					<div class="flex flex-wrap items-center justify-center gap-2">
						{#if profileId && !isRead}
							<button class="btn btn-primary" onclick={() => markRead(concept, true)}>
								<Icon paths={UI_ICONS.check} />
								{t.markRead}
							</button>
						{:else if profileId && !acquired}
							<button class="btn btn-ghost btn-sm" onclick={() => markRead(concept, false)}>
								{t.markUnread}
							</button>
						{/if}
						{#if place?.next}
							<a
								class="btn btn-soft btn-primary h-auto min-h-12 flex-col gap-0 py-1"
								href={resolve('/concept/[id]', { id: place.next.id })}
							>
								<span class="flex items-center gap-1.5">
									{t.nextSheet}<Icon paths={UI_ICONS.chevronRight} class="size-4" />
								</span>
								<small class="max-w-56 truncate font-normal opacity-80">
									{@html renderInline(place.next.title)}
								</small>
							</a>
						{/if}
					</div>
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
				<AssessmentSettings familyId={session.familyId} sheet={concept} />
				{@const familyId = session.familyId}
				<ExportButton
					label={fr.export.sheet}
					fileName={exportFileName('fiche', concept.title)}
					load={() => exportSheet(familyId, concept.id)}
				/>
			{/if}

			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				<a
					class="btn btn-soft btn-primary h-auto min-h-12 flex-col gap-0 py-1"
					href={resolve('/concept/[id]/map', { id: concept.id })}
				>
					<span class="flex items-center gap-1.5">
						<Icon paths={UI_ICONS.map} class="size-4" />{fr.mindMap.open}
					</span>
				</a>
				<a
					class="btn btn-soft btn-primary h-auto min-h-12 flex-col gap-0 py-1"
					href={resolve('/concept/[id]/cards', { id: concept.id })}
				>
					<span class="flex items-center gap-1.5">
						<Icon paths={UI_ICONS.cards} class="size-4" />{fr.cards.open}
					</span>
				</a>
				<a
					class="btn btn-soft btn-primary h-auto min-h-12 flex-col gap-0 py-1"
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
					class="btn btn-soft btn-primary h-auto min-h-12 flex-col gap-0 py-1"
					href={resolve('/concept/[id]/challenge', { id: concept.id })}
				>
					<span>{fr.challenge.title}</span>
					{#if challengeBest !== undefined}
						<small class="font-normal opacity-80">
							{fr.practice.challengeRecord(challengeBest)}
						</small>
					{/if}
				</a>
				<a
					class="btn btn-primary col-span-2 h-auto min-h-12 flex-col gap-0 py-1 sm:col-span-4"
					href={resolve('/concept/[id]/assessment', { id: concept.id })}
				>
					<span class="flex items-center gap-1.5">
						<Icon paths={UI_ICONS.clipboard} class="size-4" />{t.assessment}
					</span>
					{#if assessment.locked}
						<small class="font-normal opacity-80">{fr.assessment.sheetLocked}</small>
					{:else if assessment.best}
						<small class="font-normal opacity-80">
							{fr.assessment.sheetBest(assessment.best.correct, assessment.best.total)}
						</small>
					{/if}
				</a>
			</div>
			{#if profileId}
				<!-- Acquired sheet: a series at 70 % earns revision points, then the hourglass. -->
				<RevisionHourglass progress={readLive.data} keyPointCount={concept.keyPoints.length} />
			{/if}
		{/snippet}
	</LoadState>
</main>
