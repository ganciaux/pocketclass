<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { noteContext } from '#lib/notes/notes.ts';
	import { scrollProgress } from '#lib/scroll.ts';
	import { page } from '$app/state';

	/**
	 * « Back to the top » on a long page, once scrolled down: a round button whose ring fills up
	 * as the page is read, with the percentage inside. Stacked above « Une difficulté ? » when
	 * that one is shown (same condition as `<NoteFab>`).
	 */
	let scrollY = $state(0);
	let innerHeight = $state(0);
	let pageHeight = $state(0);

	const progress = $derived(scrollProgress(scrollY, innerHeight, pageHeight));
	const withNoteButton = $derived(
		session.ownerId !== null && noteContext(page.route.id, page.params) !== null
	);

	// The page height changes with its content (data arriving, folded examples opened).
	$effect(() => {
		const observer = new ResizeObserver(() => (pageHeight = document.documentElement.scrollHeight));
		observer.observe(document.body);
		return () => observer.disconnect();
	});

	function toTop() {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
	}

	/** Ring of the button: radius 20 in a 48 × 48 box. */
	const CIRCUMFERENCE = 2 * Math.PI * 20;
</script>

<svelte:window bind:scrollY bind:innerHeight />

{#if progress !== null}
	<button
		class={[
			'fixed right-4 z-10 grid size-14 place-items-center rounded-full bg-base-100 text-base-content shadow-lg transition-transform active:scale-95',
			withNoteButton
				? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
				: 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'
		]}
		onclick={toTop}
		aria-label={fr.common.toTop(progress)}
		title={fr.common.toTop(progress)}
	>
		<svg viewBox="0 0 48 48" class="absolute inset-0 size-full -rotate-90" aria-hidden="true">
			<circle cx="24" cy="24" r="20" fill="none" stroke-width="3" class="stroke-base-300" />
			<circle
				cx="24"
				cy="24"
				r="20"
				fill="none"
				stroke-width="3"
				stroke-linecap="round"
				class="stroke-primary"
				stroke-dasharray={CIRCUMFERENCE}
				stroke-dashoffset={CIRCUMFERENCE * (1 - progress / 100)}
			/>
		</svg>
		<span class="relative flex flex-col items-center leading-none" aria-hidden="true">
			<Icon paths={UI_ICONS.chevronUp} class="size-4" />
			<span class="text-[0.65rem] font-bold">{progress} %</span>
		</span>
	</button>
{/if}
