<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import {
		activeOnly,
		progressById,
		sheetState,
		tally,
		type SheetState
	} from '#lib/binder/binder.ts';
	import { SUBJECT_TEXT, SUBJECT_TILE } from '#lib/binder/colors.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import SheetStateBadge from '#lib/components/SheetStateBadge.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import TallyLine from '#lib/components/TallyLine.svelte';
	import { watchChapter, watchChapterContent, watchSubject } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import type { SubjectColor } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.binder;
	const chapterId = $derived(page.params.id ?? '');
	const chapterLive = live(
		() => session.familyId && chapterId && watchChapter(session.familyId, chapterId)
	);
	const contentLive = live(
		() =>
			session.familyId &&
			chapterId &&
			watchChapterContent(session.familyId, chapterId, session.childId)
	);
	// Back link, colours and picture of the subject.
	const subjectId = $derived(chapterLive.data?.subjectId);
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId)
	);
	const color = $derived<SubjectColor>(subjectLive.data?.color ?? 'amber');

	/** Step marker of the sheet path: a check once read, its number otherwise. */
	const stepStyle = (state: SheetState | null) =>
		state === 'read'
			? 'bg-success text-success-content'
			: state === 'opened'
				? ['border-2 border-current bg-base-100', SUBJECT_TEXT[color]]
				: SUBJECT_TILE[color];
</script>

<svelte:head>
	{#if chapterLive.data}<title>{chapterLive.data.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	<LoadState source={chapterLive} notFound={t.chapterNotFound} failed={t.loadFailed}>
		{#snippet children(chapter)}
			<BackLink
				href={resolve('/subject/[id]', { id: chapter.subjectId })}
				label={subjectLive.data?.name ?? t.subject}
			/>
			<header class="flex items-center gap-3">
				{#if subjectLive.data}<SubjectBadge subject={subjectLive.data} size={2.5} />{/if}
				<div class="flex min-w-0 flex-1 flex-col">
					{#if chapter.group}
						<span class="text-sm font-bold tracking-wide text-base-content/60 uppercase">
							{chapter.group}
						</span>
					{/if}
					<h1>{chapter.title}</h1>
				</div>
				{#if session.isAdmin}
					<a
						class="btn btn-ghost btn-sm"
						href={resolve('/parent/chapters/[id]', { id: chapter.id })}
					>
						{t.manage}
					</a>
				{/if}
			</header>

			<LoadState source={contentLive} failed={t.loadFailed}>
				{#snippet children(content)}
					{@const progress = progressById(content.progress)}
					{@const sheets = activeOnly(content.sheets)}
					{#if session.isChild && sheets.length > 0}
						<TallyLine tally={tally(sheets, progress)} barClass={SUBJECT_TEXT[color]} />
					{/if}

					<!-- The sheets as a path: numbered steps joined by a line, checked once read. -->
					<ol class="flex flex-col">
						{#each sheets as sheet, i (sheet.id)}
							{@const state = session.isChild ? sheetState(sheet, progress.get(sheet.id)) : null}
							<li class="relative flex gap-3 pb-3 last:pb-0">
								{#if i < sheets.length - 1}
									<span
										class="absolute top-11 bottom-0 left-[1.375rem] w-0.5 -translate-x-1/2 bg-base-300"
										aria-hidden="true"
									></span>
								{/if}
								<span
									class={[
										'relative grid size-11 shrink-0 place-items-center rounded-full font-bold',
										stepStyle(state)
									]}
									aria-hidden="true"
								>
									{#if state === 'read'}<Icon paths={UI_ICONS.check} />{:else}{i + 1}{/if}
								</span>
								<a
									class="card subject-card card-border min-w-0 flex-1 bg-base-100"
									href={resolve('/concept/[id]', { id: sheet.id })}
								>
									<div class="card-body flex-row items-center gap-3 py-3">
										<span class="min-w-0 flex-1 font-bold">{@html renderInline(sheet.title)}</span>
										{#if state}<SheetStateBadge {state} />{/if}
									</div>
								</a>
							</li>
						{:else}
							<li class="text-base-content/70">{t.noSheets}</li>
						{/each}
					</ol>
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
