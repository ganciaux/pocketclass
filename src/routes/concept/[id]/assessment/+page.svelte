<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import AcquiredStamp from '#lib/components/AcquiredStamp.svelte';
	import PlayerHeader from '#lib/components/PlayerHeader.svelte';
	import AnswerFeedback from '#lib/components/exercises/AnswerFeedback.svelte';
	import ExercisePlayer from '#lib/components/exercises/ExercisePlayer.svelte';
	import FailedStamp from '#lib/components/FailedStamp.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchConcept, watchSubject } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { saveAssessment, watchAssessmentSetup } from '#lib/data/practice.ts';
	import { countStart, watchConceptProgress } from '#lib/data/progress.ts';
	import type { AssessmentRecord, ConceptRecord, ExerciseRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { correctionOf, exercisePrompt, type PlayableExercise } from '#lib/practice/answers.ts';
	import {
		assessmentOutcome,
		assessmentPool,
		assessmentSize,
		assessmentStatus,
		buildAssessment,
		DEFAULT_PER_KEY_POINT,
		settingsOf
	} from '#lib/practice/assessment.ts';
	import { isEmpty, practiceSet } from '#lib/practice/generated.ts';
	import { scoreOf, type Result } from '#lib/practice/series.ts';
	import { renderMarkdown } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.assessment;
	const conceptId = $derived(page.params.id ?? '');
	const conceptLive = live(
		() => session.familyId && conceptId && watchConcept(session.familyId, conceptId)
	);
	const setupLive = live(
		() => session.familyId && conceptId && watchAssessmentSetup(session.familyId, conceptId)
	);
	// Whose result: a signed-in child, or the parent testing as a child (else not saved).
	const profileId = $derived(session.ownerId);
	const progressLive = live(
		() =>
			session.familyId &&
			profileId &&
			conceptId &&
			watchConceptProgress(session.familyId, profileId, conceptId)
	);
	const subjectId = $derived(conceptLive.data?.subjectId);
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId)
	);

	type Setup = {
		assessment: WithId<AssessmentRecord> | null;
		exercises: WithId<ExerciseRecord>[];
	};

	/** Pool, settings and size of this sheet's assessment. */
	function planOf(concept: WithId<ConceptRecord>, setup: Setup) {
		const pool = assessmentPool(setup.exercises, setup.assessment?.exerciseIds);
		const keyPoints = concept.keyPoints.map((kp) => kp.id);
		const perKeyPoint = setup.assessment?.draw?.perKeyPoint ?? DEFAULT_PER_KEY_POINT;
		return {
			pool,
			keyPoints,
			perKeyPoint,
			settings: settingsOf(setup.assessment, keyPoints.length),
			size: assessmentSize(pool, keyPoints, perKeyPoint),
			// Without practice content, no series could unlock a new try after a fail.
			canPractise: !isEmpty(practiceSet(setup.exercises))
		};
	}
	type Plan = ReturnType<typeof planOf>;

	let phase = $state<'ready' | 'playing' | 'done'>('ready');
	let questions = $state<PlayableExercise[]>([]);
	let index = $state(0);
	let results = $state<Result[]>([]);
	/** Settings and outcome of the assessment just played (fixed at its start / end). */
	let played = $state<Plan['settings'] | null>(null);
	let outcome = $state<ReturnType<typeof assessmentOutcome> | null>(null);
	const score = $derived(scoreOf(results));

	function start(plan: Plan, sheet: WithId<ConceptRecord>) {
		questions = buildAssessment(plan.pool, plan.keyPoints, plan.perKeyPoint);
		played = plan.settings;
		results = [];
		index = 0;
		outcome = null;
		phase = 'playing';
		if (session.familyId && profileId) countStart(session.familyId, profileId, sheet, 'assessment');
	}

	function answer(correct: boolean, concept: WithId<ConceptRecord>) {
		results.push({ exerciseId: questions[index].id, correct });
		if (index + 1 < questions.length) {
			index++;
			return;
		}
		// The outcome is read from the progress as it was before this assessment.
		const progress = progressLive.data;
		outcome = assessmentOutcome(scoreOf(results), played!, progress);
		phase = 'done';
		if (session.familyId && profileId) {
			saveAssessment(session.familyId, profileId, {
				sheet: concept,
				results: $state.snapshot(results),
				settings: played!,
				progress
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
			<PlayerHeader sheet={concept} label={t.title} />

			<LoadState source={setupLive} failed={t.loadFailed}>
				{#snippet children(setup)}
					{@const plan = planOf(concept, setup)}
					{@const status = assessmentStatus(progressLive.data, plan.canPractise)}
					{#if phase === 'playing'}
						<section class="card card-border bg-base-100">
							<div class="card-body gap-4">
								<div class="flex flex-col gap-2">
									<span class="text-sm font-bold text-base-content/60">
										{t.progress(index + 1, questions.length)}
									</span>
									<progress
										class="progress progress-primary w-full"
										aria-label={t.progress(index + 1, questions.length)}
										value={index}
										max={questions.length}
									></progress>
								</div>
								{#key index}
									<ExercisePlayer
										exercise={questions[index]}
										figures={concept.figures}
										onanswer={(correct) => answer(correct, concept)}
										feedback={false}
									/>
								{/key}
							</div>
						</section>
					{:else if phase === 'done' && outcome && played}
						<section class="card card-border bg-base-100">
							<!-- Announced after the last answer (the page does not change). -->
							<div class="card-body items-center gap-3 text-center" role="status">
								<p class="text-sm font-bold tracking-wide text-base-content/60 uppercase">
									{outcome.pass ? t.passed : t.failed}
								</p>
								<p class="text-5xl font-bold text-primary">
									{t.score(score.correct, score.total)}
								</p>
								{#if outcome.pass}
									<AcquiredStamp />
									{#if outcome.earned > 0}
										<p class="badge badge-warning badge-lg font-bold">{t.earned(outcome.earned)}</p>
									{/if}
								{:else}
									<p>{t.needed(played.passRate)}</p>
									{#if outcome.stampFailed}
										<FailedStamp />
										<p class="text-sm">{t.afterFail}</p>
									{/if}
								{/if}
								{#if !profileId}
									<p class="text-sm text-base-content/60">{fr.practice.notSaved}</p>
								{/if}
								<div class="flex w-full flex-col gap-2 pt-2">
									{#if outcome.stampFailed}
										<a
											class="btn btn-primary"
											href={resolve('/concept/[id]/practice', { id: concept.id })}
										>
											{t.toPractice}
										</a>
									{/if}
									<a
										class="btn btn-soft btn-primary font-display font-normal"
										href={resolve('/concept/[id]', { id: concept.id })}
									>
										{t.backToSheet}
									</a>
								</div>
							</div>
						</section>

						<section class="flex flex-col gap-3">
							<h2>{t.correction}</h2>
							{#each questions as question, i (question.id)}
								{@const correct = results[i]?.correct ?? false}
								{@const prompt = exercisePrompt(question)}
								<article class="card card-border bg-base-100">
									<div class="card-body gap-2">
										<h3 class="flex items-center gap-2 text-sm font-bold">
											<Icon
												paths={correct ? UI_ICONS.check : UI_ICONS.x}
												class="size-4 {correct ? 'text-success' : 'text-error'}"
											/>
											{t.question(i + 1)} · {correct ? t.right : t.wrong}
										</h3>
										{#if prompt}<div class="prose">{@html renderMarkdown(prompt)}</div>{/if}
										<AnswerFeedback
											correct={correct ? null : false}
											solution={correctionOf(question)}
											explanation={question.explanation}
										/>
									</div>
								</article>
							{/each}
						</section>
					{:else if plan.size === 0}
						<p class="alert alert-info alert-soft">{t.empty}</p>
					{:else}
						<section class="card card-border bg-base-100">
							<div class="card-body items-center gap-4 text-center">
								<Icon paths={UI_ICONS.clipboard} class="size-10 text-primary" />
								<p>{t.help(plan.size, plan.settings.passRate)}</p>
								{#if status.acquired}
									<p class="font-bold">{t.acquired}</p>
								{:else if progressLive.data?.assessmentPoints === undefined}
									<p class="font-bold">{t.reward(plan.settings.points)}</p>
								{/if}
								{#if status.best}
									<p class="text-sm text-base-content/70">
										{t.best(status.best.correct, status.best.total)}
									</p>
								{/if}
								{#if status.locked}
									<FailedStamp />
									<p class="alert alert-warning alert-soft text-start">{t.locked}</p>
									<a
										class="btn btn-primary btn-wide"
										href={resolve('/concept/[id]/practice', { id: concept.id })}
									>
										{t.toPractice}
									</a>
								{:else}
									<button
										class="btn btn-primary btn-lg btn-wide"
										onclick={() => start(plan, concept)}
									>
										{t.start}
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
