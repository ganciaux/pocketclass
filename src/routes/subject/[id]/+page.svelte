<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import {
		activeOnly,
		groupChapters,
		nextUnread,
		progressById,
		reachableSheets,
		tallyBy
	} from '#lib/binder/binder.ts';
	import { SUBJECT_BORDER } from '#lib/binder/colors.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import TallyLine from '#lib/components/TallyLine.svelte';
	import { watchSubject, watchSubjectContent } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.binder;
	const subjectId = $derived(page.params.id ?? '');
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId)
	);
	const contentLive = live(
		() =>
			session.familyId &&
			subjectId &&
			watchSubjectContent(session.familyId, subjectId, session.childId)
	);
</script>

<svelte:head>
	{#if subjectLive.data}<title>{subjectLive.data.name} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	<a class="link link-hover self-start text-sm" href={resolve('/')}>{t.backToBinder}</a>
	<LoadState source={subjectLive} notFound={t.subjectNotFound} failed={t.loadFailed}>
		{#snippet children(subject)}
			<header class={['flex items-center gap-3 border-l-8 pl-3', SUBJECT_BORDER[subject.color]]}>
				<h1 class="flex-1">{subject.name}</h1>
				<span class="badge badge-ghost">{subject.grade}</span>
				{#if session.isAdmin}
					<a
						class="btn btn-ghost btn-sm"
						href={resolve('/parent/subjects/[id]', { id: subject.id })}
					>
						{t.manage}
					</a>
				{/if}
			</header>

			<LoadState source={contentLive} failed={t.loadFailed}>
				{#snippet children(content)}
					{@const chapters = activeOnly(content.chapters)}
					{@const sheets = reachableSheets(content.sheets, chapters)}
					{@const progress = progressById(content.progress)}
					{@const tallies = tallyBy(sheets, 'chapterId', progress)}
					{@const next = session.isChild ? nextUnread(chapters, sheets, progress) : null}

					{#if next}
						<a class="btn btn-primary" href={resolve('/concept/[id]', { id: next.id })}>
							{t.next}
							{@html renderInline(next.title)}
						</a>
					{:else if session.isChild && sheets.length > 0}
						<span class="badge badge-success self-start">{t.allRead}</span>
					{/if}

					{#each groupChapters(chapters) as { group, chapters: list } (group)}
						<section class="flex flex-col gap-2">
							{#if group}<h2>{group}</h2>{/if}
							{#each list as chapter (chapter.id)}
								{@const tally = tallies.get(chapter.id) ?? { total: 0, read: 0, fresh: 0 }}
								<a
									class="card card-border bg-base-100 transition-colors hover:border-primary"
									href={resolve('/chapter/[id]', { id: chapter.id })}
								>
									<div class="card-body gap-2">
										<strong class="text-lg">{chapter.title}</strong>
										{#if session.isChild}
											<TallyLine {tally} />
										{:else}
											<span class="text-sm text-base-content/70">{t.sheets(tally.total)}</span>
										{/if}
									</div>
								</a>
							{/each}
						</section>
					{:else}
						<p class="text-base-content/70">{t.noChapters}</p>
					{/each}
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
