<script lang="ts">
	import { untrack } from 'svelte';
	import { session } from '#lib/auth.svelte.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { live } from '#lib/data/live.svelte.ts';
	import { sortCard, watchProgress } from '#lib/data/progress.ts';
	import type { ConceptRecord, WithId } from '#lib/data/types.ts';
	import {
		countPiles,
		deckOf,
		pilesOf,
		visibleCards,
		type Card,
		type Pile
	} from '#lib/flashcards/cards.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { shuffle } from '#lib/practice/series.ts';
	import { renderInline } from '#lib/render/markdown.ts';

	/**
	 * Revision cards of one sheet, a chapter or a binder: one ruled card at a time that turns
	 * over (3D), sorted « Je sais » / « À revoir » in the owner's progress (a child, or the
	 * parent testing as a child; else kept for this visit only).
	 */
	let { familyId, sheets }: { familyId: string; sheets: WithId<ConceptRecord>[] } = $props();

	const t = fr.cards;
	const profileId = $derived(session.ownerId);
	const progressLive = live(() => profileId && watchProgress(familyId, profileId));

	const deck = $derived(deckOf(sheets));
	const bySheet = $derived(new Map(sheets.map((s) => [s.id, s])));
	const severalSheets = $derived(sheets.length > 1);

	/** Piles sorted during this visit: shown at once, and the only ones when nothing is saved. */
	let sorted = $state(new Map<string, Pile>());
	const piles = $derived(new Map([...pilesOf(progressLive.data ?? []), ...sorted]));
	const counts = $derived(countPiles(deck, piles));

	/** The cards of this round, fixed when it starts (sorting a card never removes it). */
	let round = $state<Card[]>([]);
	let index = $state(0);
	let flipped = $state(false);
	let onlyReview = $state(false);
	const current = $derived(round[index]);
	const finished = $derived(round.length > 0 && index >= round.length);

	function start(cards: Card[]) {
		round = cards;
		index = 0;
		flipped = false;
	}

	// A new round when the cards change (loaded, re-imported), in the deck's order; keyed on the
	// card ids, so a refresh of the same sheets never restarts the round.
	const deckKey = $derived(deck.map((c) => c.id).join('|'));
	$effect(() => {
		void deckKey;
		untrack(() => start(visibleCards(deck, piles, onlyReview)));
	});

	const restart = () => start(visibleCards(deck, piles, onlyReview));
	const mix = () => start(shuffle(visibleCards(deck, piles, onlyReview)));
	function reviewOnly() {
		onlyReview = true;
		restart();
	}

	function go(step: number) {
		index = Math.min(Math.max(index + step, 0), round.length);
		flipped = false;
	}

	function sort(card: Card, pile: Pile) {
		sorted = new Map(sorted).set(card.id, pile);
		const sheet = bySheet.get(card.sheetId);
		if (profileId && sheet) sortCard(familyId, profileId, sheet, card.id, pile);
		go(1);
	}

	/** Space / Enter turns the card, arrows move (not while typing or on another control). */
	function onkeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select, button, a') || !current) return;
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			flipped = !flipped;
		} else if (event.key === 'ArrowRight') go(1);
		else if (event.key === 'ArrowLeft') go(-1);
	}
</script>

<svelte:window {onkeydown} />

{#if deck.length === 0}
	<p class="alert alert-info alert-soft">{t.empty}</p>
{:else}
	<!-- Piles and tools -->
	<div class="flex flex-wrap items-center gap-2">
		<span class="badge badge-soft badge-success">{t.countKnown(counts.known)}</span>
		<span class="badge badge-soft badge-error">{t.countReview(counts.review)}</span>
		<span class="badge badge-ghost">{t.countUnsorted(counts.unsorted)}</span>
		<span class="flex-1"></span>
		<button class="btn btn-ghost btn-sm" onclick={mix}>
			<Icon paths={UI_ICONS.shuffle} class="size-4" />
			{t.shuffle}
		</button>
	</div>
	<label class="flex cursor-pointer items-center gap-2 self-start text-sm">
		<input
			type="checkbox"
			class="toggle toggle-sm toggle-error"
			bind:checked={onlyReview}
			onchange={restart}
		/>
		{t.onlyReview}
	</label>
	{#if !profileId}<p class="text-sm text-base-content/60">{t.notSaved}</p>{/if}

	{#if round.length === 0}
		<p class="alert alert-success alert-soft">{t.noReview}</p>
	{:else if finished}
		<section class="card card-border bg-base-100">
			<div class="card-body items-center gap-3 text-center">
				<p class="text-2xl font-bold">{t.done}</p>
				<p class="flex flex-wrap justify-center gap-2">
					<span class="badge badge-soft badge-success">{t.countKnown(counts.known)}</span>
					<span class="badge badge-soft badge-error">{t.countReview(counts.review)}</span>
				</p>
				<div class="flex w-full flex-col gap-2 pt-2">
					{#if counts.review > 0}
						<button class="btn btn-primary" onclick={reviewOnly}>
							{t.reviewAgain(counts.review)}
						</button>
					{/if}
					<button
						class={['btn', counts.review > 0 ? 'btn-ghost' : 'btn-primary']}
						onclick={restart}
					>
						{t.restart}
					</button>
				</div>
			</div>
		</section>
	{:else if current}
		{@const sheet = bySheet.get(current.sheetId)}
		{@const pile = piles.get(current.id)}
		<p class="text-sm font-bold text-base-content/60" aria-live="polite">
			{t.position(index + 1, round.length)}
		</p>
		<div class="flashcard-scene">
			<div
				class={['flashcard', flipped && 'is-flipped']}
				role="button"
				tabindex="0"
				aria-pressed={flipped}
				aria-label={flipped ? t.back : t.front}
				onclick={() => (flipped = !flipped)}
				onkeydown={(event) => {
					if (event.key === ' ' || event.key === 'Enter') {
						event.preventDefault();
						event.stopPropagation();
						flipped = !flipped;
					}
				}}
			>
				{#snippet head()}
					<div class="flashcard-head">
						<span
							class={[
								'badge badge-sm',
								current.tag === 'pitfall' ? 'badge-error' : 'badge-outline'
							]}
						>
							{#if current.tag === 'pitfall'}<Icon paths={UI_ICONS.alert} class="size-3.5" />{/if}
							{t.tags[current.tag]}
						</span>
						{#if severalSheets && sheet}
							<span class="min-w-0 flex-1 truncate text-end text-xs text-base-content/60">
								{@html renderInline(sheet.title)}
							</span>
						{/if}
						{#if pile}
							<span class={['badge badge-sm', pile === 'known' ? 'badge-success' : 'badge-error']}>
								{pile === 'known' ? t.known : t.review}
							</span>
						{/if}
					</div>
				{/snippet}
				<div class="flashcard-face flashcard-front" aria-hidden={flipped}>
					{@render head()}
					<div class="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
						<p class="text-xl leading-snug font-bold">{@html renderInline(current.front)}</p>
						<p class="flex items-center gap-1.5 text-xs text-base-content/50">
							<Icon paths={UI_ICONS.flip} class="size-3.5" />{t.flipHint}
						</p>
					</div>
				</div>
				<div class="flashcard-face flashcard-back" aria-hidden={!flipped}>
					{@render head()}
					<div class="flex flex-1 flex-col justify-center gap-3 p-5">
						{#each current.back as line, i (i)}
							<p class="text-lg leading-relaxed">{@html renderInline(line)}</p>
						{/each}
						{#if current.example}
							<div class="rounded-box bg-base-200 p-3">
								<p class="text-xs font-bold text-base-content/60">{t.example}</p>
								<p>{@html renderInline(current.example)}</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-3 gap-2">
			<button class="btn btn-soft btn-primary" onclick={() => go(-1)} disabled={index === 0}>
				<Icon paths={UI_ICONS.chevronLeft} class="size-4" />{t.previous}
			</button>
			<button class="btn btn-primary" onclick={() => (flipped = !flipped)}>
				<Icon paths={UI_ICONS.flip} class="size-4" />{t.flip}
			</button>
			<button class="btn btn-soft btn-primary" onclick={() => go(1)}>
				{t.next}<Icon paths={UI_ICONS.chevronRight} class="size-4" />
			</button>
		</div>
		{#if flipped}
			<div class="grid grid-cols-2 gap-2">
				<button class="btn btn-soft btn-success" onclick={() => sort(current, 'known')}>
					<Icon paths={UI_ICONS.check} class="size-4" />{t.known}
				</button>
				<button class="btn btn-soft btn-error" onclick={() => sort(current, 'review')}>
					<Icon paths={UI_ICONS.x} class="size-4" />{t.review}
				</button>
			</div>
		{/if}
	{/if}
{/if}
