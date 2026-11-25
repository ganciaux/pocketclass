<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';
	import {
		checkAnswer,
		exercisePrompt,
		solutionOf,
		type PlayableExercise
	} from '#lib/practice/answers.ts';
	import { shuffle } from '#lib/practice/series.ts';
	import { renderMarkdown } from '#lib/render/markdown.ts';
	import AnswerFeedback from './AnswerFeedback.svelte';
	import CategorizeExercise from './CategorizeExercise.svelte';
	import ChoiceExercise from './ChoiceExercise.svelte';
	import ClozeExercise from './ClozeExercise.svelte';
	import MatchExercise from './MatchExercise.svelte';
	import OrderingExercise from './OrderingExercise.svelte';
	import SelfAssessExercise from './SelfAssessExercise.svelte';
	import TextExercise from './TextExercise.svelte';

	/**
	 * One exercise of any type, then the feedback. Recreate it for each question (`{#key}`): the
	 * shuffles and inputs belong to one showing. `onanswer` fires once.
	 */
	let {
		exercise,
		onanswer,
		explain = true,
		feedback = true
	}: {
		exercise: PlayableExercise;
		onanswer: (correct: boolean) => void;
		/** False (timed challenge): right / wrong and the right answer only. */
		explain?: boolean;
		/** False (assessment): nothing after the answer, the correction comes at the end. */
		feedback?: boolean;
	} = $props();

	const t = fr.practice;
	let result = $state<boolean | null>(null);
	const selfAssessed = $derived(exercise.type === 'pair' || exercise.type === 'paper');

	function answer(correct: boolean) {
		if (result !== null) return;
		result = correct;
		onanswer(correct);
	}

	// Fixed for this showing: options order and the side of a two-way card.
	// svelte-ignore state_referenced_locally
	const ex = exercise;
	const choices =
		ex.type === 'mcq'
			? shuffle([ex.answer, ...ex.distractors]).map((c) => ({ label: c, value: c }))
			: [];
	const flipped = ex.type === 'pair' && ex.direction === 'both' && Math.random() < 0.5;

	const prompt = $derived(exercisePrompt(exercise, flipped));
</script>

<div class="flex flex-col gap-4">
	{#if prompt}
		<div class="prose text-lg">{@html renderMarkdown(prompt)}</div>
	{/if}

	{#if exercise.type === 'mcq'}
		<ChoiceExercise {choices} answer={exercise.answer} onanswer={answer} />
	{:else if exercise.type === 'true_false'}
		{@const tf = exercise}
		<ChoiceExercise
			choices={[
				{ label: t.true, value: 'true' },
				{ label: t.false, value: 'false' }
			]}
			answer={String(tf.answer)}
			onanswer={answer}
		/>
	{:else if exercise.type === 'calculation' || exercise.type === 'open'}
		{@const e = exercise}
		<TextExercise check={(given) => checkAnswer(e, given)} onanswer={answer} />
	{:else if exercise.type === 'cloze'}
		{@const e = exercise}
		<ClozeExercise text={e.text} check={(given) => checkAnswer(e, given)} onanswer={answer} />
	{:else if exercise.type === 'ordering'}
		{@const e = exercise}
		<OrderingExercise items={e.items} check={(given) => checkAnswer(e, given)} onanswer={answer} />
	{:else if exercise.type === 'match'}
		{@const e = exercise}
		<MatchExercise pairs={e.pairs} check={(given) => checkAnswer(e, given)} onanswer={answer} />
	{:else if exercise.type === 'categorize'}
		{@const e = exercise}
		<CategorizeExercise
			categories={e.categories}
			items={e.items}
			check={(given) => checkAnswer(e, given)}
			onanswer={answer}
		/>
	{:else if exercise.type === 'pair'}
		<SelfAssessExercise
			answer={flipped ? exercise.front : exercise.back}
			reveal={t.showAnswer}
			yes={t.knew}
			no={t.didNotKnow}
			onanswer={answer}
		/>
	{:else if exercise.type === 'paper'}
		<SelfAssessExercise
			answer={exercise.answer || null}
			reveal={t.showCorrection}
			help={t.paperHelp}
			yes={t.succeeded}
			no={t.failed}
			onanswer={answer}
		/>
	{/if}

	{#if result !== null && feedback}
		<AnswerFeedback
			correct={selfAssessed ? null : result}
			solution={solutionOf(exercise)}
			explanation={explain ? exercise.explanation : undefined}
		/>
	{/if}
</div>
