<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import {
		activeOnly,
		isAcquired,
		isFailed,
		progressById,
		SHEET_STATUSES,
		sheetState,
		sheetStatus,
		tally,
		type SheetState,
		type SheetStatus
	} from '#lib/binder/binder.ts';
	import {
		STATUS_BADGE,
		STATUS_CHIP,
		STATUS_STEP,
		SUBJECT_TEXT,
		SUBJECT_TILE
	} from '#lib/binder/colors.ts';
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
	// Child pages: a signed-in child, or a parent testing as a child (see `session.childView`).
	const asChild = $derived(session.childView !== null);
	const ownerId = $derived(session.ownerId);
	const chapterId = $derived(page.params.id ?? '');
	const chapterLive = live(
		() => session.familyId && chapterId && watchChapter(session.familyId, chapterId)
	);
	const contentLive = live(
		() => session.familyId && chapterId && watchChapterContent(session.familyId, chapterId, ownerId)
	);
	// Back link, colours and picture of the subject.
	const subjectId = $derived(chapterLive.data?.subjectId);
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId)
	);
	const color = $derived<SubjectColor>(subjectLive.data?.color ?? 'amber');

	/** Statuses switched on in the filter bar (none = every sheet). Reset in another chapter. */
	let shown = $derived.by((): SheetStatus[] => {
		void chapterId;
		return [];
	});
	const toggle = (status: SheetStatus) =>
		(shown = shown.includes(status) ? shown.filter((s) => s !== status) : [...shown, status]);

	/** Icon of a status, the same on its filter chip and its path step. */
	const STATUS_ICON: Partial<Record<SheetStatus, 'check' | 'star' | 'sad'>> = {
		read: 'check',
		acquired: 'star',
		failed: 'sad'
	};

	/**
	 * Step marker of the sheet path: a star once acquired, a sad face after a failed assessment,
	 * a check once read, else its number.
	 */
	const stepStyle = (state: SheetState | null, acquired: boolean, failed: boolean) =>
		acquired
			? STATUS_STEP.acquired
			: failed
				? STATUS_STEP.failed
				: state === 'read' || state === 'opened'
					? STATUS_STEP[state]
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
				{#if subjectLive.data}
					<a
						class="link-icon"
						href={resolve('/subject/[id]', { id: chapter.subjectId })}
						title={subjectLive.data.name}
						aria-label={subjectLive.data.name}
					>
						<SubjectBadge subject={subjectLive.data} size={2.5} />
					</a>
				{/if}
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
					{#if asChild && sheets.length > 0}
						<TallyLine tally={tally(sheets, progress)} barClass={SUBJECT_TEXT[color]} />
					{/if}

					{@const statuses = new Map(
						sheets.map((sheet) => [sheet.id, sheetStatus(sheet, progress.get(sheet.id))])
					)}
					{@const counts = SHEET_STATUSES.map(
						(status) => [status, [...statuses.values()].filter((s) => s === status).length] as const
					).filter(([, count]) => count > 0)}
					{@const steps = sheets
						.map((sheet, i) => ({ sheet, number: i + 1 }))
						.filter(
							({ sheet }) =>
								!asChild || shown.length === 0 || shown.includes(statuses.get(sheet.id)!)
						)}
					{#if asChild && counts.length > 1}
						<div class="flex flex-wrap gap-2" role="group" aria-label={t.filter.label}>
							<button
								class={[
									'btn rounded-full btn-sm',
									shown.length === 0 ? STATUS_CHIP.all.on : STATUS_CHIP.all.off
								]}
								aria-pressed={shown.length === 0}
								onclick={() => (shown = [])}
							>
								{t.filter.all}
							</button>
							{#each counts as [status, count] (status)}
								{@const on = shown.includes(status)}
								<button
									class={[
										'btn rounded-full btn-sm',
										on ? STATUS_CHIP[status].on : STATUS_CHIP[status].off
									]}
									aria-pressed={on}
									onclick={() => toggle(status)}
								>
									{#if STATUS_ICON[status]}
										<Icon paths={UI_ICONS[STATUS_ICON[status]]} class="size-4" />
									{/if}
									{t.filter.status[status]}
									<span class="badge badge-sm">{count}</span>
								</button>
							{/each}
						</div>
					{/if}

					<!-- The sheets as a path: numbered steps joined by a line, checked once read. -->
					<ol class="flex flex-col">
						{#each steps as { sheet, number }, i (sheet.id)}
							{@const state = asChild ? sheetState(sheet, progress.get(sheet.id)) : null}
							{@const acquired = asChild && isAcquired(progress.get(sheet.id))}
							{@const failed = asChild && isFailed(progress.get(sheet.id))}
							<li class="group relative flex gap-3 pb-3 last:pb-0">
								{#if i < steps.length - 1}
									<span
										class="absolute top-11 bottom-0 left-[1.375rem] w-0.5 -translate-x-1/2 bg-base-300"
										aria-hidden="true"
									></span>
								{/if}
								<!-- The step opens the sheet too; hovering either one lights up both. -->
								<a
									class={[
										'relative grid size-11 shrink-0 place-items-center rounded-full font-bold transition-shadow group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-base-200',
										stepStyle(state, acquired, failed)
									]}
									href={resolve('/concept/[id]', { id: sheet.id })}
									tabindex="-1"
									aria-hidden="true"
								>
									{#if acquired}<Icon paths={UI_ICONS.star} />
									{:else if failed}<Icon paths={UI_ICONS.sad} />
									{:else if state === 'read'}<Icon paths={UI_ICONS.check} />
									{:else}{number}{/if}
								</a>
								<a
									class="link-card card card-border min-w-0 flex-1 bg-base-100 group-hover:border-primary"
									href={resolve('/concept/[id]', { id: sheet.id })}
								>
									<div class="card-body flex-row items-center gap-3 py-3">
										<span class="min-w-0 flex-1 font-bold">
											{@html renderInline(sheet.title)}
										</span>
										{#if acquired}
											<span class={['badge badge-sm shrink-0', STATUS_BADGE.acquired]}>
												{fr.stamp.label}
											</span>
										{:else if failed}
											<span class={['badge badge-sm shrink-0', STATUS_BADGE.failed]}>
												{fr.assessment.failedStamp}
											</span>
										{/if}
										<!-- After a stamp, only news (new / updated) still deserves a badge. -->
										{#if state && (!(acquired || failed) || state === 'new' || state === 'updated')}
											<SheetStateBadge {state} />
										{/if}
									</div>
								</a>
							</li>
						{:else}
							<li class="text-base-content/70">
								{sheets.length > 0 ? t.filter.empty : t.noSheets}
							</li>
						{/each}
					</ol>
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
