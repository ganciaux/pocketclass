<script lang="ts">
	import {
		activeOnly,
		byOrder,
		progressById,
		reachableSheets,
		sortSubjects,
		visibleSubjects
	} from '#lib/binder/binder.ts';
	import { SUBJECT_BORDER } from '#lib/binder/colors.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import PointsBadge from '#lib/components/PointsBadge.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import { watchBinder } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchAttempts } from '#lib/data/practice.ts';
	import { combine } from '#lib/data/sources.ts';
	import type { Profile, ProgressRecord } from '#lib/data/types.ts';
	import { formatDate, formatDateTime, fr } from '#lib/i18n/fr.ts';
	import { percent } from '#lib/practice/scores.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { groupStats, recentAttempts, type GroupStats, type Runs } from '#lib/stats/stats.ts';
	import { resolve } from '$app/paths';

	/**
	 * Statistics of one profile (a child, or the parent's own test data): overview of every
	 * binder, or the detail of one (`subjectId`): one row per sheet and the latest runs.
	 */
	let {
		familyId,
		profileId,
		view,
		points,
		subjectId
	}: {
		familyId: string;
		profileId: string;
		/** The child's grade and extra subjects; null = every active subject (parent's tests). */
		view: Pick<Profile, 'grade' | 'extraSubjects'> | null;
		points: number;
		subjectId: string | null;
	} = $props();

	const t = fr.stats;
	const dataLive = live(() =>
		combine({
			binder: watchBinder(familyId, profileId),
			attempts: watchAttempts(familyId, profileId)
		})
	);
	const base = $derived(`${resolve('/parent/stats')}?child=${encodeURIComponent(profileId)}`);
	const subjectHref = (id: string) => `${base}&subject=${encodeURIComponent(id)}`;
	const when = (ms: number | null) => (ms === null ? t.never : formatDate(new Date(ms)));
	const some = (r: Runs) => r.finished > 0 || (r.started ?? 0) > 0;

	/** One line about a sheet: only what happened (« Pas encore » when nothing did). */
	function sheetLine(one: GroupStats, p: ProgressRecord | undefined): string {
		const parts = [
			one.opens > 0 && t.opens(one.opens),
			some(one.series) && `${t.series} : ${t.runs(one.series.finished, one.series.started)}`,
			p?.practiceLast &&
				t.lastScore(fr.practice.score(p.practiceLast.correct, p.practiceLast.total)),
			p?.practiceBest && t.best(percent(p.practiceBest)),
			some(one.challenges) &&
				`${t.challenges} : ${t.runs(one.challenges.finished, one.challenges.started)}`,
			one.challengeBest !== null && t.record(one.challengeBest),
			some(one.assessments) &&
				`${t.assessments} : ${t.runs(one.assessments.finished, one.assessments.started)}`,
			p?.assessmentBest && t.best(percent(p.assessmentBest))
		].filter(Boolean);
		return parts.length ? parts.join(' · ') : t.never;
	}
</script>

<!-- One figure of a block: small label above, value below. -->
{#snippet figure(label: string, value: string)}
	<div class="flex flex-col">
		<dt class="text-xs text-base-content/60">{label}</dt>
		<dd class="font-bold">{value}</dd>
	</div>
{/snippet}

<!-- Runs of a group of sheets: series, challenges, assessments (with their extra). -->
{#snippet runFigures(stats: GroupStats)}
	{@render figure(
		t.series,
		[
			t.runs(stats.series.finished, stats.series.started),
			stats.seriesAverage !== null && t.average(stats.seriesAverage)
		]
			.filter(Boolean)
			.join(' · ')
	)}
	{@render figure(
		t.challenges,
		[
			t.runs(stats.challenges.finished, stats.challenges.started),
			stats.challengeBest !== null && t.record(stats.challengeBest)
		]
			.filter(Boolean)
			.join(' · ')
	)}
	{@render figure(t.assessments, t.runs(stats.assessments.finished, stats.assessments.started))}
{/snippet}

<LoadState source={dataLive} failed={t.loadFailed}>
	{#snippet children({ binder, attempts })}
		{@const subjects = view
			? visibleSubjects(binder.subjects, view)
			: sortSubjects(activeOnly(binder.subjects))}
		{@const sheets = reachableSheets(binder.sheets, binder.chapters)}
		{@const progress = progressById(binder.progress)}
		{@const idsOf = (id: string) => sheets.filter((s) => s.subjectId === id).map((s) => s.id)}
		{@const subject = subjectId ? subjects.find((s) => s.id === subjectId) : undefined}

		{#if !subject}
			{@const all = groupStats(
				subjects.flatMap((s) => idsOf(s.id)),
				progress,
				attempts
			)}
			<section class="card card-border bg-base-100">
				<dl class="card-body grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
					<div class="flex flex-col items-start gap-1">
						<dt class="text-xs text-base-content/60">{t.points}</dt>
						<dd><PointsBadge {points} /></dd>
					</div>
					{@render figure(t.read, `${all.read} / ${all.sheets}`)}
					{@render figure(t.acquired, String(all.acquired))}
					{@render figure(
						t.finished,
						String(all.series.finished + all.challenges.finished + all.assessments.finished)
					)}
					{@render figure(t.lastActivity, when(all.lastActivity))}
				</dl>
			</section>

			<ul class="grid gap-3 sm:grid-cols-2">
				{#each subjects as item (item.id)}
					{@const stats = groupStats(idsOf(item.id), progress, attempts)}
					<li class="flex">
						<a
							class={[
								'link-card card card-border w-full border-l-8 bg-base-100',
								SUBJECT_BORDER[item.color]
							]}
							href={subjectHref(item.id)}
						>
							<div class="card-body gap-3 p-4">
								<div class="flex items-center gap-3">
									<SubjectBadge subject={item} size={2.5} />
									<div class="flex min-w-0 flex-col">
										<strong class="truncate">{item.name}</strong>
										<span class="text-sm text-base-content/70">
											{fr.binder.read(stats.read, stats.sheets)}
											{#if stats.acquired}· {fr.binder.acquired(stats.acquired)}{/if}
											{#if stats.failed}· {t.failed(stats.failed)}{/if}
										</span>
									</div>
								</div>
								<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
									{@render figure(t.lastActivity, when(stats.lastActivity))}
									{@render figure(t.openings, String(stats.opens))}
									{@render runFigures(stats)}
								</dl>
							</div>
						</a>
					</li>
				{:else}
					<li class="text-base-content/70">{t.noSubjects}</li>
				{/each}
			</ul>
		{:else}
			{@const stats = groupStats(idsOf(subject.id), progress, attempts)}
			{@const chapters = byOrder(
				activeOnly(binder.chapters).filter((c) => c.subjectId === subject.id),
				(c) => c.title
			)}
			{@const titles = new Map(sheets.map((s) => [s.id, s.title]))}
			{@const recent = recentAttempts(attempts, subject.id)}
			<header class="flex items-center gap-3">
				<SubjectBadge {subject} size={3} />
				<div class="flex flex-col">
					<h2>{subject.name}</h2>
					<span class="text-sm text-base-content/70">
						{t.binderLine(
							fr.binder.read(stats.read, stats.sheets),
							t.opens(stats.opens),
							when(stats.lastActivity)
						)}
					</span>
				</div>
			</header>
			<dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
				{@render runFigures(stats)}
			</dl>

			{#each chapters as chapter (chapter.id)}
				{@const list = byOrder(
					sheets.filter((s) => s.chapterId === chapter.id),
					(s) => s.title
				)}
				{#if list.length > 0}
					<section class="card card-border bg-base-100">
						<div class="card-body gap-2 p-4">
							<h3 class="card-title text-base">{chapter.title}</h3>
							<ul class="flex flex-col gap-1">
								{#each list as sheet (sheet.id)}
									{@const p = progress.get(sheet.id)}
									{@const one = groupStats([sheet.id], progress, attempts)}
									<li class="link-row relative -mx-2 flex flex-col gap-1 px-2 py-2">
										<span class="flex flex-wrap items-center gap-2">
											<a
												class="font-bold after:absolute after:inset-0"
												href={resolve('/concept/[id]', { id: sheet.id })}
											>
												{@html renderInline(sheet.title)}
											</a>
											{#if one.acquired}
												<span class="badge badge-success badge-sm">{t.acquiredBadge}</span>
											{:else if one.failed}
												<span class="badge badge-error badge-sm">{t.failedBadge}</span>
											{/if}
										</span>
										<span class="text-sm text-base-content/70">
											{sheetLine(one, p)}
										</span>
									</li>
								{/each}
							</ul>
						</div>
					</section>
				{/if}
			{/each}

			<section class="flex flex-col gap-2">
				<h2>{t.recent}</h2>
				{#if recent.length === 0}
					<p class="text-sm text-base-content/70">{t.noAttempts}</p>
				{:else}
					<div class="card card-border overflow-x-auto bg-base-100">
						<table class="table table-sm">
							<caption class="sr-only">{t.recent}</caption>
							<thead>
								<tr>
									<th scope="col">{t.when}</th>
									<th scope="col">{t.sheet}</th>
									<th scope="col">{t.kind}</th>
									<th scope="col" class="text-end">{t.score}</th>
								</tr>
							</thead>
							<tbody>
								{#each recent as run (run.id)}
									<tr>
										<td class="whitespace-nowrap">
											{run.createdAt ? formatDateTime(run.createdAt.toDate()) : t.pending}
										</td>
										<td>{@html renderInline(titles.get(run.conceptId) ?? t.hiddenSheet)}</td>
										<td>{t.mode[run.mode]}</td>
										<td class="text-end font-bold whitespace-nowrap">
											{fr.practice.score(run.correct, run.total)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{/if}
		<p class="text-xs text-base-content/60">{t.countedSince}</p>
	{/snippet}
</LoadState>
