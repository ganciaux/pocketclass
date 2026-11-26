<script lang="ts">
	import { SUBJECT_BORDER } from '#lib/binder/colors.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import { watchActivity } from '#lib/data/activity.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { activityDays, activityEntries } from '#lib/stats/activity.ts';
	import { resolve } from '$app/paths';

	/**
	 * Activity history of a profile, by day (newest first): each finished run with its score
	 * and the points it earned. The last 30 days, then 30 more per « Voir plus ».
	 */
	let { familyId, profileId }: { familyId: string; profileId: string } = $props();

	const t = fr.activity;
	const WINDOW_DAYS = 30;
	const activityLive = live(() => watchActivity(familyId, profileId));
	let days = $state(WINDOW_DAYS);
	// The day labels are computed once: the page is not kept open across midnight.
	const now = Date.now();

	const dayLabel = (daysAgo: number, day: number) =>
		daysAgo === 0 ? t.today : daysAgo === 1 ? t.yesterday : t.day(new Date(day));
	const time = (ms: number) =>
		new Date(Number.isFinite(ms) ? ms : now).toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit'
		});
</script>

<LoadState source={activityLive} failed={t.loadFailed}>
	{#snippet children(activity)}
		{@const passRates = new Map(
			activity.assessments.flatMap((a) => (a.passRate === undefined ? [] : [[a.id, a.passRate]]))
		)}
		{@const entries = activityEntries(activity.attempts, activity.lines, passRates)}
		{@const shown = activityDays(entries, now, days)}
		{@const sheets = new Map(activity.binder.sheets.map((s) => [s.id, s]))}
		{@const subjects = new Map(activity.binder.subjects.map((s) => [s.id, s]))}
		{#if entries.length === 0}
			<p class="text-base-content/70">{t.empty}</p>
		{:else if shown.days.length === 0}
			<p class="text-base-content/70">{t.emptyWindow}</p>
		{/if}
		{#each shown.days as day (day.day)}
			<section class="flex flex-col gap-2">
				<h3 class="flex items-center justify-between gap-2 font-bold first-letter:uppercase">
					<span>{dayLabel(day.daysAgo, day.day)}</span>
					{#if day.points > 0}
						<span class="badge badge-success">{t.dayPoints(day.points)}</span>
					{/if}
				</h3>
				<ul class="flex flex-col gap-2">
					{#each day.entries as entry (entry.id)}
						{@const sheet = sheets.get(entry.conceptId)}
						{@const subject = subjects.get(entry.subjectId)}
						<li
							class={[
								'card card-border border-l-8 bg-base-100',
								subject ? SUBJECT_BORDER[subject.color] : 'border-base-300'
							]}
						>
							<div class="card-body flex-row items-center gap-3 px-4 py-2.5">
								{#if subject}<SubjectBadge {subject} size={1.75} />{/if}
								<div class="flex min-w-0 flex-1 flex-col">
									<span class="text-xs font-bold text-base-content/60">
										{time(entry.at)} <span aria-hidden="true">·</span>
										{t.kind[entry.kind]}
									</span>
									{#if sheet}
										<a
											class="link font-bold link-hover"
											href={resolve('/concept/[id]', { id: sheet.id })}
										>
											{@html renderInline(sheet.title)}
										</a>
									{:else}
										<span class="font-bold text-base-content/60">{t.deletedSheet}</span>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end gap-1 text-sm">
									{#if entry.score}
										<span class="font-bold">
											{entry.kind === 'timed'
												? t.challengeScore(entry.score.correct)
												: fr.practice.score(entry.score.correct, entry.score.total)}
										</span>
									{/if}
									<span class="flex gap-1">
										{#if entry.passed !== null}
											<span
												class={[
													'badge badge-sm',
													entry.passed ? 'badge-success badge-soft' : 'badge-error badge-soft'
												]}
											>
												{entry.passed ? t.passed : t.failed}
											</span>
										{/if}
										{#if entry.points > 0}
											<span class="badge badge-sm badge-success">{t.points(entry.points)}</span>
										{/if}
									</span>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
		{#if shown.more}
			<button class="btn btn-soft btn-primary self-start" onclick={() => (days += WINDOW_DAYS)}>
				{t.more}
			</button>
		{/if}
	{/snippet}
</LoadState>
