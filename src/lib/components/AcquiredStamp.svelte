<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { stamp } from '#lib/motion.ts';

	/** The « Acquise » stamp on a sheet: tilted, double border, the teacher's green ink. */
</script>

<p
	in:stamp
	class={[
		'inline-flex -rotate-6 items-center gap-1.5 self-start rounded-md border-4 border-double border-current px-3 py-1',
		'text-lg font-bold tracking-widest text-success uppercase opacity-90'
	]}
>
	<Icon paths={UI_ICONS.star} class="size-5" />
	{fr.stamp.label}
</p>
