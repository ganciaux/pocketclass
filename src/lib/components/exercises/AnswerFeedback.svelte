<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { renderInline } from '#lib/render/markdown.ts';

	/**
	 * After an answer: right or wrong, the right answer when it was wrong, and the explanation.
	 * `correct` null: self-assessed, only the explanation is shown.
	 */
	let {
		correct,
		solution,
		explanation
	}: { correct: boolean | null; solution: string[]; explanation?: string } = $props();
</script>

{#if correct !== null || explanation}
	<div
		role="status"
		class={[
			'alert alert-soft flex flex-col items-start gap-2',
			correct === true && 'alert-success',
			correct === false && 'alert-error',
			correct === null && 'alert-info'
		]}
	>
		{#if correct !== null}
			<strong class="flex items-center gap-2 text-base">
				<Icon paths={correct ? UI_ICONS.check : UI_ICONS.x} />
				{correct ? fr.practice.correct : fr.practice.wrong}
			</strong>
		{/if}
		{#if correct === false && solution.length > 0}
			<div>
				<span class="text-sm font-bold">{fr.practice.expected} :</span>
				{#if solution.length === 1}
					<span>{@html renderInline(solution[0])}</span>
				{:else}
					<ul class="mt-1 flex flex-col gap-0.5">
						{#each solution as line, i (i)}<li>{@html renderInline(line)}</li>{/each}
					</ul>
				{/if}
			</div>
		{/if}
		{#if explanation}
			<p class="flex gap-2">
				<Icon paths={UI_ICONS.lightbulb} class="mt-0.5 size-4" />
				<span>
					<span class="sr-only">{fr.practice.why} :</span>{@html renderInline(explanation)}
				</span>
			</p>
		{/if}
	</div>
{/if}
