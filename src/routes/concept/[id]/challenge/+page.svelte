<script lang="ts">
	import { onDestroy } from 'svelte';
	import { session } from '#lib/auth.svelte.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import ExercisePlayer from '#lib/components/exercises/ExercisePlayer.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchConcept } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { saveChallenge, watchPracticeSet } from '#lib/data/practice.ts';
	import { watchConceptProgress } from '#lib/data/progress.ts';
	import type { ConceptRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import type { PlayableExercise } from '#lib/practice/answers.ts';
	import {
		CHALLENGE_MAX_ANSWERS,
		CHALLENGE_MIN_EXERCISES,
		CHALLENGE_SECONDS,
		canChallenge,
		challengeDraw
	} from '#lib/practice/challenge.ts';
	import type { PracticeSet } from '#lib/practice/generated.ts';
	import { scoreOf, type Result } from '#lib/practice/series.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.challenge;
	const conceptId = $derived(page.params.id ?? '');
	const conceptLive = live(
		() => session.familyId && conceptId && watchConcept(session.familyId, conceptId)
	);
	const setLive = live(
		() => session.familyId && conceptId && watchPracticeSet(session.familyId, conceptId)
	);
	const profileId = $derived(session.childView?.ownerId ?? null);
	const progressLive = live(
		() =>
			session.familyId &&
			profileId &&
			conceptId &&
			watchConceptProgress(session.familyId, profileId, conceptId)
	);
	const record = $derived(progressLive.data?.challengeBest ?? null);

	/** Pause after an answer: short when right, longer when wrong (to read the right answer). */
	const NEXT_RIGHT_MS = 450;
	const NEXT_WRONG_MS = 1500;

	let phase = $state<'ready' | 'playing' | 'done'>('ready');
	let current = $state<PlayableExercise | null>(null);
	let shown = $state(0);
	let results = $state<Result[]>([]);
	let secondsLeft = $state(CHALLENGE_SECONDS);
	/** Record before this challenge, to say « Nouveau record ! ». */
	let previousRecord = $state<number | null>(null);
	const score = $derived(scoreOf(results));

	let next: () => PlayableExercise | null = () => null;
	/** The sheet being played (set by `start`), for the save. */
	let sheet: WithId<ConceptRecord> | null = null;
	let ticker: ReturnType<typeof setInterval> | undefined;
	let advance: ReturnType<typeof setTimeout> | undefined;
	function stopTimers() {
		clearInterval(ticker);
		clearTimeout(advance);
	}
	onDestroy(stopTimers);

	function start(set: PracticeSet, concept: WithId<ConceptRecord>) {
		sheet = concept;
		next = challengeDraw(set);
		results = [];
		previousRecord = record;
		current = next();
		shown++;
		phase = 'playing';
		// A deadline, not a count of ticks: stays right if the phone is slow or the tab sleeps.
		const deadline = Date.now() + CHALLENGE_SECONDS * 1000;
		secondsLeft = CHALLENGE_SECONDS;
		ticker = setInterval(() => {
			secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
			if (secondsLeft === 0) finish();
		}, 200);
	}

	function answer(correct: boolean) {
		if (phase !== 'playing' || !current) return;
		results.push({ exerciseId: current.id, correct });
		if (results.length >= CHALLENGE_MAX_ANSWERS) return finish();
		advance = setTimeout(
			() => {
				current = next();
				shown++;
			},
			correct ? NEXT_RIGHT_MS : NEXT_WRONG_MS
		);
	}

	function finish() {
		if (phase !== 'playing') return;
		stopTimers();
		phase = 'done';
		if (sheet && session.familyId && profileId) {
			saveChallenge(session.familyId, profileId, {
				sheet,
				results: $state.snapshot(results),
				best: previousRecord
			});
		}
	}
</script>

<svelte:head>
	{#if conceptLive.data}<title>{t.title} · {conceptLive.data.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	<LoadState source={conceptLive} notFound={fr.concept.notFound} failed={fr.concept.loadFailed}>
		{#snippet children(concept)}
			<BackLink href={resolve('/concept/[id]', { id: concept.id })} label={fr.practice.sheet} />
			<header class="flex flex-col gap-1">
				<span class="text-sm font-bold text-base-content/60">{t.title}</span>
				<h1>{@html renderInline(concept.title)}</h1>
			</header>

			<LoadState source={setLive} failed={fr.practice.loadFailed}>
				{#snippet children(set)}
					{#if !canChallenge(set)}
						<p class="alert alert-info alert-soft">{t.tooFew(CHALLENGE_MIN_EXERCISES)}</p>
					{:else if phase === 'ready'}
						<section class="card card-border bg-base-100">
							<div class="card-body items-center gap-4 text-center">
								<p>{t.help(CHALLENGE_SECONDS)}</p>
								<p class="font-bold">{record !== null ? t.record(record) : t.noRecord}</p>
								<button class="btn btn-primary btn-lg btn-wide" onclick={() => start(set, concept)}>
									{t.start}
								</button>
							</div>
						</section>
					{:else if phase === 'playing' && current}
						<section class="card card-border bg-base-100">
							<div class="card-body gap-4">
								<div class="flex items-center justify-between gap-3">
									<span
										class={[
											'text-2xl font-bold tabular-nums',
											secondsLeft <= 10 ? 'text-error' : 'text-primary'
										]}
										role="timer"
									>
										{t.timeLeft(secondsLeft)}
									</span>
									<span class="badge badge-success badge-soft badge-lg" aria-live="polite">
										{t.right(score.correct)}
									</span>
								</div>
								<progress
									class={[
										'progress w-full',
										secondsLeft <= 10 ? 'progress-error' : 'progress-primary'
									]}
									value={secondsLeft}
									max={CHALLENGE_SECONDS}
								></progress>
								{#key shown}
									<ExercisePlayer exercise={current} onanswer={answer} explain={false} />
								{/key}
							</div>
						</section>
					{:else if phase === 'done'}
						{@const beaten = score.correct > 0 && score.correct > (previousRecord ?? 0)}
						<section class="card card-border bg-base-100">
							<div class="card-body items-center gap-3 text-center">
								<p class="text-sm font-bold tracking-wide text-base-content/60 uppercase">
									{t.done}
								</p>
								<p class="text-5xl font-bold text-primary">{score.correct}</p>
								<p>{t.result(score.correct, score.total)}</p>
								{#if beaten}
									<p class="badge badge-warning badge-lg font-bold">{t.newRecord}</p>
								{:else if previousRecord !== null}
									<p class="text-sm text-base-content/60">{t.record(previousRecord)}</p>
								{/if}
								{#if !profileId}
									<p class="text-sm text-base-content/60">{fr.practice.notSaved}</p>
								{/if}
								<div class="flex w-full flex-col gap-2 pt-2">
									<button class="btn btn-primary" onclick={() => start(set, concept)}>
										{t.again}
									</button>
									<a class="btn btn-ghost" href={resolve('/concept/[id]', { id: concept.id })}>
										{fr.practice.backToSheet}
									</a>
								</div>
							</div>
						</section>
					{/if}
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
