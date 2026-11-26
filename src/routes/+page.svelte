<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { UI_ICONS, type IconPath } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import PointsBadge from '#lib/components/PointsBadge.svelte';
	import SubjectCards from '#lib/components/SubjectCards.svelte';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchNotes } from '#lib/data/notes.ts';
	import { openCount } from '#lib/notes/notes.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { displayName } from '#lib/profile/display.ts';
	import { resolve } from '$app/paths';

	// Parents see every subject of the family; children (or a parent testing as a child) see
	// their binder with their progress.
	const ownerId = $derived(session.ownerId);
	const notesLive = live(
		() => session.familyId && ownerId && watchNotes(session.familyId, ownerId)
	);

	/** The other parent pages, beside « Classeurs » (each with its icon). */
	const parentLinks = [
		{ href: resolve('/parent/profiles'), icon: UI_ICONS.users, label: fr.home.manageProfiles },
		{ href: resolve('/parent/notes'), icon: UI_ICONS.message, label: fr.home.childrenNotes },
		{ href: resolve('/parent/stats'), icon: UI_ICONS.chart, label: fr.home.stats }
	];
</script>

<svelte:head><title>{fr.app.name}</title></svelte:head>

<main class="doodles">
	<h1>
		{fr.auth.hello(
			session.childView?.name ?? (session.profile ? displayName(session.profile) : '')
		)}
	</h1>
	{#if session.childView && session.profile}
		<!-- Points earned by passed assessments (the owner's profile, also in test mode). -->
		<p class="self-start"><PointsBadge points={session.profile.points ?? 0} size="lg" /></p>
	{/if}

	{#if session.isAdmin && !session.childView}
		<section class="card bg-neutral text-neutral-content">
			<div class="card-body gap-3">
				<h2 class="card-title">{fr.home.parentSection}</h2>
				<div class="flex flex-wrap gap-2">
					<a class="btn btn-primary" href={resolve('/parent/subjects')}>
						<Icon paths={UI_ICONS.binders} class="size-5" />
						{fr.home.manageBinder}
					</a>
					<!-- Outline buttons take the page text colour: set the strip's own (readable on slate). -->
					{#each parentLinks as link (link.href)}
						<a
							class="btn btn-outline border-neutral-content/40 text-neutral-content"
							href={link.href}
						>
							<Icon paths={link.icon} class="size-5" />
							{link.label}
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	{#if session.familyId && session.profile}
		<section class="flex flex-col gap-2">
			<h2>{session.childView ? fr.home.myBinder : fr.home.familyBinder}</h2>
			<SubjectCards familyId={session.familyId} view={session.childView} {ownerId} />
		</section>
	{/if}

	{#if session.childView}
		{@const open = openCount(notesLive.data ?? [])}
		<div class="grid gap-3 sm:grid-cols-2">
			{@render homeLink(resolve('/me/sheets'), UI_ICONS.book, fr.home.seenTitle, fr.home.seenHint)}
			{@render homeLink(
				resolve('/me/notes'),
				UI_ICONS.message,
				fr.home.notesTitle,
				fr.home.notesHint,
				open > 0 ? fr.home.notesOpen(open) : null
			)}
		</div>
	{/if}

	<!-- A big tappable row: icon, title, one line of help, optional count, chevron. -->
	{#snippet homeLink(
		href: string,
		icon: IconPath[],
		title: string,
		hint: string,
		badge: string | null = null
	)}
		<a class="link-card card card-border bg-base-100" {href}>
			<div class="card-body flex-row items-center gap-3 p-4">
				<span
					class="link-lead grid size-11 shrink-0 place-items-center rounded-full bg-secondary/15"
				>
					<Icon paths={icon} class="size-5 text-secondary" />
				</span>
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="flex items-center gap-2 text-base font-bold">
						{title}
						{#if badge}<span class="badge badge-warning badge-sm">{badge}</span>{/if}
					</span>
					<span class="text-sm text-base-content/70">{hint}</span>
				</span>
				<Icon paths={UI_ICONS.chevronRight} class="size-5 text-base-content/40" />
			</div>
		</a>
	{/snippet}
</main>
