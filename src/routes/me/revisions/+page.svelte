<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { SUBJECT_BORDER } from '#lib/binder/colors.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import { ticking } from '#lib/clock.svelte.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import { watchBinder } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { binderRevisions, revisionPoints, timeLeft } from '#lib/practice/revision.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';

	// The child's acquired sheets: ready to revise first (a series at 70 % earns points), then
	// the hourglasses, soonest first.
	const t = fr.revision;
	const ownerId = $derived(session.ownerId);
	const binderLive = live(
		() => session.familyId && ownerId && watchBinder(session.familyId, ownerId)
	);
	const clock = ticking();
</script>

<svelte:head><title>{t.title} · {fr.app.name}</title></svelte:head>

<main>
	<BackLink href={resolve('/')} label={fr.app.home} />
	<h1>{t.title}</h1>
	{#if session.childView}
		{@const view = session.childView}
		<LoadState source={binderLive} failed={t.loadFailed}>
			{#snippet children(binder)}
				{@const list = binderRevisions(binder, view, clock.now)}
				{@const ready = list.filter((e) => e.status.kind === 'ready')}
				{@const waiting = list.filter((e) => e.status.kind === 'waiting')}
				{#if list.length === 0}
					<p class="text-base-content/70">{t.empty}</p>
				{/if}
				{#if ready.length > 0}
					<h2>{t.readyHeading}</h2>
					<ul class="flex flex-col gap-2">
						{#each ready as entry (entry.sheet.id)}
							{@render row(entry, fr.revision.practise)}
						{/each}
					</ul>
				{/if}
				{#if waiting.length > 0}
					<h2>{t.waitingHeading}</h2>
					<ul class="flex flex-col gap-2">
						{#each waiting as entry (entry.sheet.id)}
							{@render row(entry, null)}
						{/each}
					</ul>
				{/if}

				{#snippet row(entry: (typeof list)[number], action: string | null)}
					<li>
						<a
							class={[
								'card link-card card-border border-l-8 bg-base-100',
								SUBJECT_BORDER[entry.subject.color]
							]}
							href={action
								? resolve('/concept/[id]/practice', { id: entry.sheet.id })
								: resolve('/concept/[id]', { id: entry.sheet.id })}
						>
							<div class="card-body flex-row items-center gap-3 py-3">
								<SubjectBadge subject={entry.subject} size={2} />
								<div class="flex min-w-0 flex-1 flex-col">
									<span class="truncate text-xs font-bold text-base-content/60">
										{entry.subject.name} <span aria-hidden="true">·</span>
										{entry.chapter.title}
									</span>
									<span class="font-bold">{@html renderInline(entry.sheet.title)}</span>
								</div>
								{#if entry.status.kind === 'waiting'}
									<span class="flex shrink-0 items-center gap-1 text-sm text-base-content/70">
										<Icon paths={UI_ICONS.hourglass} class="size-4 text-secondary" />
										{t.left(timeLeft(entry.status.readyAt - clock.now))}
									</span>
								{:else}
									<span class="badge shrink-0 badge-success">
										+{revisionPoints(entry.sheet.keyPoints.length)}
									</span>
								{/if}
							</div>
						</a>
					</li>
				{/snippet}
			{/snippet}
		</LoadState>
	{/if}
</main>
