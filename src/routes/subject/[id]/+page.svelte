<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import {
		activeOnly,
		groupChapters,
		nextUnread,
		progressById,
		reachableSheets,
		tally,
		tallyBy
	} from '#lib/binder/binder.ts';
	import { SUBJECT_TEXT, SUBJECT_TILE, SUBJECT_TINT } from '#lib/binder/colors.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import PointsStar from '#lib/components/PointsStar.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import { pointsBySubject } from '#lib/practice/assessment.ts';
	import TallyLine from '#lib/components/TallyLine.svelte';
	import { watchSubject, watchSubjectContent } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import type { Chapter, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.binder;
	// Child pages: a signed-in child, or a parent testing as a child (see `session.childView`).
	const asChild = $derived(session.childView !== null);
	const ownerId = $derived(session.ownerId);
	const subjectId = $derived(page.params.id ?? '');
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId)
	);
	const contentLive = live(
		() => session.familyId && subjectId && watchSubjectContent(session.familyId, subjectId, ownerId)
	);

	/** Chapter numbers in display order (groups first-come, as on the page). */
	const numbering = (chapters: WithId<Chapter>[]) =>
		new Map(
			groupChapters(chapters)
				.flatMap((g) => g.chapters)
				.map((c, i) => [c.id, i + 1])
		);
</script>

<svelte:head>
	{#if subjectLive.data}<title>{subjectLive.data.name} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	<BackLink href={resolve('/')} label={fr.app.home} />
	<LoadState source={subjectLive} notFound={t.subjectNotFound} failed={t.loadFailed}>
		{#snippet children(subject)}
			<LoadState source={contentLive} failed={t.loadFailed}>
				{#snippet children(content)}
					{@const chapters = activeOnly(content.chapters)}
					{@const sheets = reachableSheets(content.sheets, chapters)}
					{@const progress = progressById(content.progress)}
					{@const tallies = tallyBy(sheets, 'chapterId', progress)}
					{@const numbers = numbering(chapters)}
					{@const next = asChild ? nextUnread(chapters, sheets, progress) : null}

					<!-- Banner in the subject's colour: its picture, name and overall progress. -->
					<header class={['card relative', SUBJECT_TINT[subject.color]]}>
						{#if asChild}
							{@const points = pointsBySubject(content.progress).get(subject.id) ?? 0}
							<!-- Gold star sticker on the corner, as on the binder card. -->
							{#if points > 0}
								<PointsStar {points} class="absolute -top-4 -right-2 z-10 rotate-12" />
							{/if}
						{/if}
						<div class="card-body gap-3">
							<div class="flex items-center gap-4">
								<SubjectBadge {subject} size={4} />
								<div class="flex min-w-0 flex-1 flex-col">
									<!-- A child knows their grade: only show it for a subject of another grade. -->
									{#if !session.childView || subject.grade !== session.childView.grade}
										<span class="badge badge-ghost badge-sm self-start">{subject.grade}</span>
									{/if}
									<h1 class="break-words">{subject.name}</h1>
								</div>
							</div>
							{#if asChild}
								<span class="text-sm text-base-content/70">
									{t.chapterCount(chapters.length)} · {t.sheets(sheets.length)}
								</span>
								<TallyLine tally={tally(sheets, progress)} barClass={SUBJECT_TEXT[subject.color]} />
							{:else}
								<div class="flex items-center justify-between gap-2">
									<span class="text-sm text-base-content/70">
										{t.chapterCount(chapters.length)} · {t.sheets(sheets.length)}
									</span>
									{#if session.isAdmin}
										<a
											class="btn btn-ghost btn-sm"
											href={resolve('/parent/subjects/[id]', { id: subject.id })}
										>
											{t.manage}
										</a>
									{/if}
								</div>
							{/if}
						</div>
					</header>

					{#if next}
						<a
							class="link-card card bg-primary text-primary-content shadow-sm"
							href={resolve('/concept/[id]', { id: next.id })}
						>
							<div class="card-body flex-row items-center gap-3">
								<span
									class="link-lead grid size-10 place-items-center rounded-full bg-primary-content/15"
								>
									<Icon paths={UI_ICONS.play} />
								</span>
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="text-sm font-bold opacity-80">{t.next}</span>
									<span class="font-bold">{@html renderInline(next.title)}</span>
								</span>
								<Icon paths={UI_ICONS.chevronRight} />
							</div>
						</a>
					{:else if asChild && sheets.length > 0}
						<p role="status" class="alert alert-success alert-soft">
							<Icon paths={UI_ICONS.check} />
							{t.allRead}
						</p>
					{/if}

					{#each groupChapters(chapters) as { group, chapters: list } (group)}
						<section class="flex flex-col gap-2">
							{#if group}
								<h2
									class="divider divider-start text-sm tracking-wide text-base-content/60 uppercase"
								>
									{group}
								</h2>
							{/if}
							<!-- Two chapters per row from tablets on, like the binders of the home page. -->
							<div class="grid gap-2 sm:grid-cols-2">
								{#each list as chapter (chapter.id)}
									{@const chapterTally = tallies.get(chapter.id) ?? {
										total: 0,
										read: 0,
										fresh: 0,
										acquired: 0
									}}
									<a
										class="link-card card card-border bg-base-100"
										href={resolve('/chapter/[id]', { id: chapter.id })}
									>
										<div class="card-body flex-row items-center gap-3 p-4">
											<span
												class={[
													'link-lead grid size-10 shrink-0 place-items-center rounded-full text-lg font-bold',
													SUBJECT_TILE[subject.color]
												]}
											>
												{numbers.get(chapter.id)}
											</span>
											<div class="flex min-w-0 flex-1 flex-col gap-2">
												<strong class="leading-tight">
													{chapter.title}
												</strong>
												{#if asChild}
													<TallyLine tally={chapterTally} barClass={SUBJECT_TEXT[subject.color]} />
												{:else}
													<span class="text-sm text-base-content/70">
														{t.sheets(chapterTally.total)}
													</span>
												{/if}
											</div>
											<Icon paths={UI_ICONS.chevronRight} class="size-5 text-base-content/40" />
										</div>
									</a>
								{/each}
							</div>
						</section>
					{:else}
						<p class="text-base-content/70">{t.noChapters}</p>
					{/each}
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
