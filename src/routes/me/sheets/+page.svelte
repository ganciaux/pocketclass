<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { SUBJECT_BORDER, SUBJECT_TEXT } from '#lib/binder/colors.ts';
	import { activeSubjectId, filterSeen, pickRandom, seenSheets } from '#lib/binder/seen.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import SheetStateBadge from '#lib/components/SheetStateBadge.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import { watchBinder } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// The sheets the child already opened (or the parent, testing as a child): latest first,
	// searchable, filterable by subject, or one at random to revise.
	const t = fr.seen;
	const ownerId = $derived(session.childView?.ownerId ?? null);
	const binderLive = live(
		() => session.familyId && ownerId && watchBinder(session.familyId, ownerId)
	);

	// A tag of a sheet links here with `?q=<tag>`: the search starts filled in.
	let query = $state(page.url.searchParams.get('q') ?? '');
	let subjectId = $state<string | null>(null);

	function openRandom(ids: string[]) {
		const id = pickRandom(ids);
		if (id) void goto(resolve('/concept/[id]', { id }));
	}
</script>

<svelte:head><title>{t.title} · {fr.app.name}</title></svelte:head>

<main>
	<BackLink href={resolve('/')} label={fr.app.home} />
	{#if session.childView}
		{@const view = session.childView}
		<LoadState source={binderLive} failed={t.loadFailed}>
			{#snippet children(binder)}
				{@const seen = seenSheets(binder, view)}
				{@const shown = filterSeen(seen, query, subjectId)}
				{@const active = activeSubjectId(seen, subjectId)}
				<!-- Chips: only the subjects that have seen sheets, in the order they first appear. -->
				{@const subjects = [...new Map(seen.map((e) => [e.subject.id, e.subject])).values()]}

				<header class="flex items-center justify-between gap-2">
					<h1>{t.title}</h1>
					<button
						class="btn btn-secondary btn-sm"
						disabled={shown.length === 0}
						onclick={() => openRandom(shown.map((e) => e.sheet.id))}
					>
						{t.random}
					</button>
				</header>

				{#if seen.length === 0}
					<p class="text-base-content/70">{t.empty}</p>
				{:else}
					<input
						type="search"
						class="input w-full"
						placeholder={t.search}
						aria-label={t.search}
						bind:value={query}
					/>
					<div class="flex flex-wrap gap-2" role="group" aria-label={fr.binder.subject}>
						<button
							class={['btn btn-sm', active === null && 'btn-active']}
							aria-pressed={active === null}
							onclick={() => (subjectId = null)}
						>
							{t.all}
						</button>
						{#each subjects as subject (subject.id)}
							<button
								class={[
									'btn btn-sm border-2',
									SUBJECT_BORDER[subject.color],
									active === subject.id ? 'btn-active' : SUBJECT_TEXT[subject.color]
								]}
								aria-pressed={active === subject.id}
								onclick={() => (subjectId = subject.id)}
							>
								{subject.name}
							</button>
						{/each}
					</div>

					<ul class="flex flex-col gap-2">
						{#each shown as entry (entry.sheet.id)}
							<li>
								<a
									class={[
										'card subject-card card-border border-l-8 bg-base-100',
										SUBJECT_BORDER[entry.subject.color]
									]}
									href={resolve('/concept/[id]', { id: entry.sheet.id })}
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
										{#if entry.state === 'read' || entry.state === 'updated'}
											<SheetStateBadge state={entry.state} />
										{/if}
									</div>
								</a>
							</li>
						{:else}
							<li class="text-base-content/70">{t.noMatch}</li>
						{/each}
					</ul>
				{/if}
			{/snippet}
		</LoadState>
	{/if}
</main>
