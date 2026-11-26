<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';

	/**
	 * Points as a gold star sticker with the number inside, like the one a teacher sticks on an
	 * exercise book: the child home total (`lg`) and the corner of a binder card (`sm`).
	 */
	let {
		points,
		size = 'sm',
		class: className = ''
	}: { points: number; size?: 'sm' | 'lg'; class?: string } = $props();

	/** Smaller digits from 3 digits up, so the number stays inside the star. */
	const long = $derived(points >= 100);
</script>

<!-- `class` places the sticker (e.g. on a card's corner); the star inside is its own box. -->
<span class={['shrink-0', className]}>
	<span
		class={['relative grid place-items-center text-warning', size === 'sm' ? 'size-16' : 'size-20']}
	>
		<svg viewBox="0 0 24 24" class="absolute inset-0 size-full" aria-hidden="true">
			<path
				d="M12 1.8l3.05 6.2 6.85 1-4.95 4.8 1.17 6.8L12 17.4l-6.12 3.2 1.17-6.8L2.1 9l6.85-1z"
				fill="currentColor"
				stroke="var(--color-base-100)"
				stroke-width="1.2"
				stroke-linejoin="round"
			/>
		</svg>
		<span
			class={[
				'relative pt-[12%] font-display leading-none text-warning-content',
				size === 'sm' ? (long ? 'text-xs' : 'text-base') : long ? 'text-base' : 'text-xl'
			]}
			aria-hidden="true"
		>
			{points}
		</span>
		<span class="sr-only">{fr.points.count(points)}</span>
	</span>
</span>
