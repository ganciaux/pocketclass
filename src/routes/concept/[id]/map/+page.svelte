<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import ExercisePlayer from '#lib/components/exercises/ExercisePlayer.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import MapImages from '#lib/components/MapImages.svelte';
	import MindMap from '#lib/components/MindMap.svelte';
	import { watchConcept, watchSubject } from '#lib/data/catalog.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchPracticeSet } from '#lib/data/practice.ts';
	import { saveMapDrawn, watchConceptProgress } from '#lib/data/progress.ts';
	import type { ConceptRecord, SubjectColor, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { drawMapTest, hasQuestions, mapBranches } from '#lib/mindmap/mindmap.ts';
	import type { PlayableExercise } from '#lib/practice/answers.ts';
	import type { PracticeSet } from '#lib/practice/generated.ts';
	import { scoreOf, type Result } from '#lib/practice/series.ts';
	import { renderInline } from '#lib/render/markdown.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const t = fr.mindMap;
	const conceptId = $derived(page.params.id ?? '');
	const conceptLive = live(
		() => session.familyId && conceptId && watchConcept(session.familyId, conceptId)
	);
	const practiceSetLive = live(
		() => session.familyId && conceptId && watchPracticeSet(session.familyId, conceptId)
	);
	const subjectId = $derived(conceptLive.data?.subjectId);
	const subjectLive = live(
		() => session.familyId && subjectId && watchSubject(session.familyId, subjectId)
	);
	const color = $derived<SubjectColor>(subjectLive.data?.color ?? 'amber');
	// Whose draws: a signed-in child, or the parent testing as a child (else kept in memory).
	const profileId = $derived(session.ownerId);
	const progressLive = live(
		() =>
			session.familyId &&
			profileId &&
			conceptId &&
			watchConceptProgress(session.familyId, profileId, conceptId)
	);
	/** Draws of this visit when nothing is saved (parent view). */
	let localDrawn = $state<string[]>([]);

	/** The test in progress: on one branch (`focus`) or the whole map (null). */
	let test = $state<{ focus: string | null; questions: PlayableExercise[] } | null>(null);
	let round = $state(0);
	let index = $state(0);
	let answered = $state(false);
	let results = $state<Result[]>([]);
	const finished = $derived(test !== null && index >= test.questions.length);
	const score = $derived(scoreOf(results));

	function start(sheet: WithId<ConceptRecord>, set: PracticeSet, focus: string | null) {
		const drawn = profileId ? (progressLive.data?.mapDrawn ?? []) : localDrawn;
		const next = drawMapTest(set, drawn, focus);
		if (session.familyId && profileId) saveMapDrawn(session.familyId, profileId, sheet, next.drawn);
		else localDrawn = next.drawn;
		test = { focus, questions: next.questions };
		index = 0;
		answered = false;
		results = [];
		round++;
		scrollTo({ top: 0 });
	}

	function answer(correct: boolean) {
		if (!test) return;
		results.push({ exerciseId: test.questions[index].id, correct });
		answered = true;
	}

	function next() {
		answered = false;
		index++;
	}

	/** What the test is about, above the questions. */
	const about = (sheet: WithId<ConceptRecord>, focus: string | null) =>
		focus ? (sheet.keyPoints.find((k) => k.id === focus)?.label ?? '') : t.wholeMap;
</script>

<svelte:head>
	{#if conceptLive.data}<title>{t.title} · {conceptLive.data.title} · {fr.app.name}</title>{/if}
</svelte:head>

<main>
	<LoadState source={conceptLive} notFound={fr.concept.notFound} failed={fr.concept.loadFailed}>
		{#snippet children(concept)}
			<BackLink href={resolve('/concept/[id]', { id: concept.id })} label={fr.practice.sheet} />

			<LoadState source={practiceSetLive} failed={t.loadFailed}>
				{#snippet children(set)}
					{#if test === null}
						<span class="text-sm font-bold text-base-content/60">{t.title}</span>
						<MindMap
							title={concept.title}
							branches={mapBranches(concept)}
							{color}
							cantest={(keyPoint) => hasQuestions(set, keyPoint)}
							ontest={(keyPoint) => start(concept, set, keyPoint)}
						/>
						{#if hasQuestions(set, null)}
							<button class="btn btn-primary self-center" onclick={() => start(concept, set, null)}>
								{t.testAll}
							</button>
						{:else}
							<p class="alert alert-info alert-soft">{t.noQuestions}</p>
						{/if}
						{#if session.familyId}
							<MapImages
								familyId={session.familyId}
								conceptId={concept.id}
								canEdit={session.isAdmin && !session.childView}
							/>
						{/if}
					{:else}
						<header class="flex flex-col gap-1">
							<span class="text-sm font-bold text-base-content/60">
								{@html renderInline(t.testing(about(concept, test.focus)))}
							</span>
							<h1>{@html renderInline(concept.title)}</h1>
						</header>
						{#if test.questions.length === 0}
							<p class="alert alert-info alert-soft">{t.noQuestions}</p>
							<button
								class="btn btn-soft btn-primary self-start font-display font-normal"
								onclick={() => (test = null)}
							>
								{t.back}
							</button>
						{:else if finished}
							<section class="card card-border bg-base-100">
								<div class="card-body items-center gap-3 text-center">
									<p class="text-5xl font-bold text-primary">
										{fr.practice.score(score.correct, score.total)}
									</p>
									<p class="text-lg">{fr.practice.cheer(score.correct / score.total)}</p>
									<div class="flex w-full flex-col gap-2 pt-2">
										<button
											class="btn btn-primary"
											onclick={() => start(concept, set, test!.focus)}
										>
											{t.again}
										</button>
										<button
											class="btn btn-soft btn-primary font-display font-normal"
											onclick={() => (test = null)}
										>
											{t.back}
										</button>
									</div>
								</div>
							</section>
						{:else}
							<section class="card card-border bg-base-100">
								<div class="card-body gap-4">
									<div class="flex flex-col gap-1.5">
										<span class="text-xs font-bold tracking-wide text-base-content/50 uppercase">
											{fr.practice.progress(index + 1, test.questions.length)}
										</span>
										<progress
											class="progress progress-primary w-full"
											value={index + (answered ? 1 : 0)}
											max={test.questions.length}
										></progress>
									</div>
									{#key `${round}-${index}`}
										<ExercisePlayer exercise={test.questions[index]} onanswer={answer} />
									{/key}
									{#if answered}
										<button class="btn btn-primary self-end" onclick={next}>
											{index + 1 < test.questions.length ? fr.practice.next : fr.practice.seeResult}
											<Icon paths={UI_ICONS.chevronRight} />
										</button>
									{/if}
								</div>
							</section>
						{/if}
					{/if}
				{/snippet}
			</LoadState>
		{/snippet}
	</LoadState>
</main>
