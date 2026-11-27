<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import ExercisePlayer from '#lib/components/exercises/ExercisePlayer.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { watchBinder } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { saveReview, watchReview } from '#lib/data/mistakes.ts';
	import { combine } from '#lib/data/sources.ts';
	import type { ConceptRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import type { PlayableExercise } from '#lib/practice/answers.ts';
	import {
		buildReview,
		dueMistakes,
		mistakes,
		reviewable,
		REVIEW_SIZE
	} from '#lib/practice/mistakes.ts';
	import { timeLeft } from '#lib/practice/revision.ts';
	import { scoreOf, type Result } from '#lib/practice/series.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';

	// The questions the child got wrong, back the next day, then 3 days later after a right
	// answer, done after two right answers in a row (practice/mistakes.ts).
	const t = fr.mistakes;
	const ownerId = $derived(session.ownerId);
	const dataLive = live(
		() =>
			session.familyId &&
			ownerId &&
			combine({
				binder: watchBinder(session.familyId, ownerId),
				review: watchReview(session.familyId, ownerId)
			})
	);

	/** The review in progress: frozen when it starts (later runs change the mistakes list). */
	let questions = $state<{ conceptId: string; exercise: PlayableExercise }[]>([]);
	let round = $state(0);
	let index = $state(0);
	let answered = $state(false);
	let results = $state<Result[]>([]);
	const finished = $derived(questions.length > 0 && index >= questions.length);
	const score = $derived(scoreOf(results));

	function start(items: Parameters<typeof buildReview>[0]) {
		questions = buildReview(items);
		index = 0;
		answered = false;
		results = [];
		round++;
		scrollTo({ top: 0 });
	}

	function answer(correct: boolean) {
		results.push({ exerciseId: questions[index].exercise.id, correct });
		answered = true;
	}

	function next(sheets: Map<string, WithId<ConceptRecord>>) {
		answered = false;
		index++;
		if (index < questions.length || !session.familyId || !ownerId) return;
		saveReview(
			session.familyId,
			ownerId,
			$state.snapshot(results).flatMap((result, i) => {
				const sheet = sheets.get(questions[i].conceptId);
				return sheet ? [{ ...result, sheet }] : [];
			})
		);
	}
</script>

<svelte:head><title>{t.title} · {fr.app.name}</title></svelte:head>

<main>
	<BackLink href={resolve('/')} label={fr.app.home} />
	<h1>{t.title}</h1>
	{#if session.childView}
		<LoadState source={dataLive} failed={t.loadFailed}>
			{#snippet children({ binder, review })}
				{@const sheets = new Map(binder.sheets.map((s) => [s.id, s]))}
				{@const subjects = new Map(binder.subjects.map((s) => [s.id, s]))}
				{@const now = Date.now()}
				{@const open = reviewable(mistakes(review.attempts, now), review.exercises)}
				{@const { due, nextAt } = dueMistakes(open, now)}

				{#if finished}
					<section class="card card-border bg-base-100">
						<div class="card-body items-center gap-3 text-center">
							<p class="text-5xl font-bold text-primary">
								{fr.practice.score(score.correct, score.total)}
							</p>
							<p class="text-lg">{fr.practice.cheer(score.correct / score.total)}</p>
							<p class="text-sm text-base-content/70">{t.howItWorks}</p>
							<div class="flex w-full flex-col gap-2 pt-2">
								{#if due.length > 0}
									<button class="btn btn-primary" onclick={() => start(due)}>
										{t.again(Math.min(due.length, REVIEW_SIZE))}
									</button>
								{/if}
								<a class="btn btn-soft btn-primary" href={resolve('/')}>{fr.app.home}</a>
							</div>
						</div>
					</section>
				{:else if questions.length > 0}
					{@const current = questions[index]}
					{@const sheet = sheets.get(current.conceptId)}
					<section class="card card-border bg-base-100">
						<div class="card-body gap-4">
							<div class="flex flex-col gap-1.5">
								<span class="text-sm font-bold text-base-content/60">
									{fr.practice.progress(index + 1, questions.length)}
									{#if sheet}
										<span aria-hidden="true">·</span>
										{subjects.get(sheet.subjectId)?.name}
										<span aria-hidden="true">·</span>
										{@html renderInline(sheet.title)}
									{/if}
								</span>
								<progress
									class="progress progress-primary w-full"
									value={index + (answered ? 1 : 0)}
									max={questions.length}
								></progress>
							</div>
							{#key `${round}-${index}`}
								<ExercisePlayer
									exercise={current.exercise}
									figures={sheet?.figures}
									onanswer={answer}
								/>
							{/key}
							{#if answered}
								<button class="btn btn-primary self-end" onclick={() => next(sheets)}>
									{index + 1 < questions.length ? fr.practice.next : fr.practice.seeResult}
									<Icon paths={UI_ICONS.chevronRight} />
								</button>
							{/if}
						</div>
					</section>
				{:else if due.length > 0}
					<section class="card card-border bg-base-100">
						<div class="card-body items-start gap-3">
							<p class="text-lg font-bold">{t.due(due.length)}</p>
							<p class="text-sm text-base-content/70">{t.howItWorks}</p>
							<button class="btn btn-primary" onclick={() => start(due)}>
								{t.start(Math.min(due.length, REVIEW_SIZE))}
							</button>
						</div>
					</section>
				{:else if nextAt !== null}
					<p class="alert alert-soft">
						<Icon paths={UI_ICONS.hourglass} class="size-5 text-secondary" />
						<span>{t.nothingToday(fr.revision.left(timeLeft(nextAt - now)))}</span>
					</p>
				{:else}
					<p class="alert alert-success alert-soft">{t.none}</p>
				{/if}
			{/snippet}
		</LoadState>
	{/if}
</main>
