<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';

	/** Points earned (child home total, a subject card, a subject banner). */
	let { points, size = 'md' }: { points: number; size?: 'sm' | 'md' | 'lg' } = $props();
</script>

<span
	class={[
		'badge badge-warning shrink-0 gap-1 font-bold',
		size === 'sm' && 'badge-sm',
		size === 'lg' && 'badge-lg'
	]}
>
	<Icon paths={UI_ICONS.star} class={size === 'sm' ? 'size-3' : 'size-4'} />
	{fr.points.count(points)}
</span>
