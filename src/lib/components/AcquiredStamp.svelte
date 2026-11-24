<script lang="ts">
	import { SUBJECT_TEXT } from '#lib/binder/colors.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import type { SubjectColor } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { stamp } from '#lib/motion.ts';

	/** The parent's « Acquise » stamp on a sheet: tilted, double border, in the subject's ink. */
	let { color }: { color: SubjectColor } = $props();
</script>

<p
	in:stamp
	class={[
		'inline-flex -rotate-6 items-center gap-1.5 self-start rounded-md border-4 border-double border-current px-3 py-1',
		'text-lg font-bold tracking-widest uppercase opacity-90',
		SUBJECT_TEXT[color]
	]}
>
	<Icon paths={UI_ICONS.star} class="size-5" />
	{fr.stamp.label}
</p>
