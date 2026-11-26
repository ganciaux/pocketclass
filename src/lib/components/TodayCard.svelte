<script lang="ts">
	import { UI_ICONS, type IconPath } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import TallyMarks from '#lib/components/TallyMarks.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';

	/**
	 * The child's « Aujourd'hui », at the top of the home page, like a page of the school diary:
	 * the days in a row with some practice (tally marks), then at most three things to do now
	 * (mistakes to review, a revision ready, the next sheet to read). Computed by the home page.
	 */
	let {
		streak,
		dueMistakes,
		revision,
		nextSheet
	}: {
		streak: { days: number; today: boolean };
		dueMistakes: number;
		revision: { id: string; title: string; points: number } | null;
		nextSheet: { id: string; title: string } | null;
	} = $props();

	const t = fr.today;
	const date = new Date().toLocaleDateString('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});

	type Task = { href: string; icon: IconPath[]; label: string };
	const tasks = $derived.by(() => {
		const list: Task[] = [];
		if (dueMistakes > 0) {
			list.push({
				href: resolve('/me/mistakes'),
				icon: UI_ICONS.refresh,
				label: t.mistakes(dueMistakes)
			});
		}
		if (revision) {
			list.push({
				href: resolve('/concept/[id]/practice', { id: revision.id }),
				icon: UI_ICONS.hourglass,
				label: t.revision(revision.title, revision.points)
			});
		}
		if (nextSheet) {
			list.push({
				href: resolve('/concept/[id]', { id: nextSheet.id }),
				icon: UI_ICONS.book,
				label: t.read(nextSheet.title)
			});
		}
		return list;
	});
</script>

<section class="card card-border border-l-8 border-l-primary bg-base-100">
	<div class="card-body gap-3">
		<header class="flex flex-wrap items-baseline justify-between gap-x-3">
			<h2 class="card-title">{t.title}</h2>
			<span class="text-sm text-base-content/60 first-letter:uppercase">{date}</span>
		</header>

		<div
			class={[
				'flex flex-wrap items-center gap-x-3 gap-y-1',
				streak.today ? 'text-secondary' : 'text-base-content/50'
			]}
		>
			{#if streak.days > 0}<TallyMarks count={streak.days} />{/if}
			<span class="font-bold text-base-content">
				{streak.days > 0 ? t.streak(streak.days) : t.startStreak}
			</span>
			{#if streak.days > 0 && !streak.today}
				<span class="text-sm text-base-content/70">{t.keepStreak}</span>
			{/if}
		</div>

		{#if tasks.length > 0}
			<ul class="flex flex-col gap-1">
				{#each tasks as task (task.href)}
					<li>
						<a class="link-row -mx-2 flex items-center gap-3 px-2 py-2" href={task.href}>
							<span
								class="link-lead grid size-9 shrink-0 place-items-center rounded-full bg-primary/15"
							>
								<Icon paths={task.icon} class="size-5 text-primary" />
							</span>
							<span class="min-w-0 flex-1">{@html renderInline(task.label)}</span>
							<Icon paths={UI_ICONS.chevronRight} class="size-5 text-base-content/40" />
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-base-content/70">{t.allDone}</p>
		{/if}
	</div>
</section>
