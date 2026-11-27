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
	 * as the page is read, an arrow inside. Stacked above « Une difficulté ? » when
	 * that one is shown (same condition as `<NoteFab>`).
	 *
	 * It shows while the page moves and fades out after IDLE_MS without scrolling (not while
	 * pointed at or focused from the keyboard: a tap's focus would keep it forever). Always in the DOM, only faded: iOS draws a fixed element created
	 * during a momentum scroll at a stale place (mid-page) until the scroll ends.
	 */
	const IDLE_MS = 2500;
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

	let awake = $state(false);
	let held = false;
	let idleTimer: ReturnType<typeof setTimeout> | undefined;
	function sleepLater() {
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			if (!held) awake = false;
		}, IDLE_MS);
	}
	function wake() {
		awake = true;
		sleepLater();
	}
	function hold(on: boolean) {
		held = on;
		if (!on) sleepLater();
	}
	$effect(() => () => clearTimeout(idleTimer));

	const shown = $derived(progress !== null && awake);

	function toTop() {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
	}

	/** Ring of the button: radius 20 in a 48 × 48 box. */
	const CIRCUMFERENCE = 2 * Math.PI * 20;
</script>

<svelte:window bind:scrollY bind:innerHeight onscroll={wake} />

<button
	class={[
		'fixed right-4 z-10 grid size-14 transform-gpu place-items-center rounded-full bg-base-100 text-base-content shadow-lg transition-[opacity,translate,scale] duration-200 ease-(--ease-out) active:scale-95 motion-reduce:transition-opacity',
		withNoteButton
			? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
			: 'bottom-[calc(1rem+env(safe-area-inset-bottom))]',
		!shown && 'pointer-events-none translate-y-3 opacity-0 motion-reduce:translate-y-0'
	]}
	inert={!shown}
	onclick={toTop}
	onpointerenter={() => hold(true)}
	onpointerleave={() => hold(false)}
	onfocus={(event) => hold(event.currentTarget.matches(':focus-visible'))}
	onblur={() => hold(false)}
	aria-label={fr.common.toTop(progress ?? 0)}
	title={fr.common.toTop(progress ?? 0)}
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
			stroke-dashoffset={CIRCUMFERENCE * (1 - (progress ?? 0) / 100)}
		/>
	</svg>
	<Icon paths={UI_ICONS.chevronUp} class="relative size-7" />
</button>
