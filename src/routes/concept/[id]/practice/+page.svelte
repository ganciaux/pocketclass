<script lang="ts">
	import { untrack } from 'svelte';
	import { session } from '#lib/auth.svelte.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import ExercisePlayer from '#lib/components/exercises/ExercisePlayer.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchConcept } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { saveSeries, watchPlayableExercises } from '#lib/data/practice.ts';
	import { watchConceptProgress } from '#lib/data/progress.ts';
	import type { ConceptRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import type { PlayableExercise } from '#lib/practice/answers.ts';
	import { buildSeries, scoreOf, shuffle, wrongIds, type Result } from '#lib/practice/series.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.practice;
	const conceptId = $derived(page.params.id ?? '');
	const conceptLive = live(
		() => session.familyId && conceptId && watchConcept(session.familyId, conceptId)
	);
	const exercisesLive = live(
		() => session.familyId && conceptId && watchPlayableExercises(session.familyId, conceptId)
	);
	// Whose scores: a signed-in child, or the parent testing as a child (else not saved).
	const profileId = $derived(session.childView?.ownerId ?? null);
	const progressLive = live(
		() =>
			session.familyId &&
			profileId &&
			conceptId &&
			watchConceptProgress(session.familyId, profileId, conceptId)
	);

	/** The questions of this round; `round` changes on every new series (fresh components). */
	let series = $state<PlayableExercise[]>([]);
	let round = $state(0);
	let index = $state(0);
	let results = $state<Result[]>([]);
	/** « Refaire mes erreurs »: a replay, not recorded as a series. */
	let retrying = $state(false);
	let answered = $state(false);
	const finished = $derived(series.length > 0 && index >= series.length);
	const score = $derived(scoreOf(results));

	function start(exercises: PlayableExercise[], replay = false) {
		series = replay ? shuffle(exercises) : buildSeries(exercises);
		retrying = replay;
		results = [];
		index = 0;
		answered = false;
		round++;
	}

	// First series once the exercises are there (later catalogue changes do not restart it).
	$effect(() => {
		const exercises = exercisesLive.data;
		if (exercises && untrack(() => round) === 0 && exercises.length > 0)
			untrack(() => start(exercises));
	});

	function answer(correct: boolean) {
		results.push({ exerciseId: series[index].id, correct });
		answered = true;
	}

	function next(sheet: WithId<ConceptRecord>) {
		answered = false;
		index++;
		if (index < series.length || retrying || !session.familyId || !profileId) return;
		saveSeries(session.familyId, profileId, {
			sheet,
			results: $state.snapshot(results),
			best: progressLive.data?.practiceBest
		});
	}

	function retryWrong() {
		const wrong = new Set(wrongIds(results));
		start(
			series.filter((e) => wrong.has(e.id)),
			true
		);
	}
</script>

<svelte:head>
	{#if conceptLive.data}<title>{t.title} · {conceptLive.data.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	<LoadState source={conceptLive} notFound={fr.concept.notFound} failed={fr.concept.loadFailed}>
		{#snippet children(concept)}
			<BackLink href={resolve('/concept/[id]', { id: concept.id })} label={t.sheet} />
			<header class="flex flex-col gap-1">
				<span class="text-sm font-bold text-base-content/60">
					{retrying ? t.retryRound : t.title}
				</span>
				<h1>{@html renderInline(concept.title)}</h1>
			</header>

			<LoadState source={exercisesLive} failed={t.loadFailed}>
				{#snippet children(exercises)}
					{#if exercises.length === 0}
						<p class="alert alert-info alert-soft">{t.empty}</p>
					{:else if finished}
						{@const wrong = wrongIds(results).length}
						<section class="card card-border bg-base-100">
							<div class="card-body items-center gap-3 text-center">
								<p class="text-5xl font-bold text-primary">{t.score(score.correct, score.total)}</p>
								<p class="text-lg">{t.cheer(score.correct / score.total)}</p>
								{#if !profileId}<p class="text-sm text-base-content/60">{t.notSaved}</p>{/if}
								<div class="flex w-full flex-col gap-2 pt-2">
									{#if wrong > 0}
										<button class="btn btn-primary" onclick={retryWrong}>
											{t.retryWrong(wrong)}
										</button>
									{/if}
									<button
										class={['btn', wrong > 0 ? 'btn-outline' : 'btn-primary']}
										onclick={() => start(exercises)}
									>
										{t.newSeries}
									</button>
									<a class="btn btn-ghost" href={resolve('/concept/[id]', { id: concept.id })}>
										{t.backToSheet}
									</a>
								</div>
							</div>
						</section>
					{:else if series.length > 0}
						<section class="card card-border bg-base-100">
							<div class="card-body gap-4">
								<div class="flex flex-col gap-1.5">
									<span class="text-xs font-bold tracking-wide text-base-content/50 uppercase">
										{t.progress(index + 1, series.length)}
									</span>
									<progress
										class="progress progress-primary w-full"
										value={index + (answered ? 1 : 0)}
										max={series.length}
									></progress>
								</div>
								{#key `${round}-${index}`}
									<ExercisePlayer exercise={series[index]} onanswer={answer} />
								{/key}
								{#if answered}
									<button class="btn btn-primary self-end" onclick={() => next(concept)}>
										{index + 1 < series.length ? t.next : t.seeResult}
										<Icon paths={UI_ICONS.chevronRight} />
									</button>
								{/if}
							</div>
						</section>
					{/if}
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
