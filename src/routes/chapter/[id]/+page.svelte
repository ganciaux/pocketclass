<script lang="ts">
	import BackLink from '#lib/components/BackLink.svelte';
	import { session } from '#lib/auth.svelte.ts';
	import { activeOnly, progressById, sheetState } from '#lib/binder/binder.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import SheetStateBadge from '#lib/components/SheetStateBadge.svelte';
	import { watchChapter, watchChapterContent, watchSubject } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
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
	// For the back link only.
	const subjectId = $derived(chapterLive.data?.subjectId);
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId)
	);
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
				<div class="flex flex-1 flex-col">
					{#if chapter.group}
						<span class="text-sm text-base-content/70">{chapter.group}</span>
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
					<ul class="flex flex-col gap-2">
						{#each activeOnly(content.sheets) as sheet (sheet.id)}
							<li>
								<a
									class="card card-border bg-base-100 transition-colors hover:border-primary"
									href={resolve('/concept/[id]', { id: sheet.id })}
								>
									<div class="card-body flex-row items-center gap-3">
										<span class="flex-1 font-bold">{@html renderInline(sheet.title)}</span>
										{#if session.isChild}
											<SheetStateBadge state={sheetState(sheet, progress.get(sheet.id))} />
										{/if}
									</div>
								</a>
							</li>
						{:else}
							<li class="text-base-content/70">{t.noSheets}</li>
						{/each}
					</ul>
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
