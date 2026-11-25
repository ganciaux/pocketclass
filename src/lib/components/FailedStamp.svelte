<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { stamp } from '#lib/motion.ts';

	/** The « Raté » stamp after a failed assessment: tilted the other way, dashed, sad face. */
</script>

<p
	in:stamp
	class="inline-flex rotate-3 items-center gap-1.5 self-start rounded-md border-2 border-dashed border-current px-3 py-1 text-error opacity-90"
>
	<Icon paths={UI_ICONS.sad} class="size-5" />
	<span class="text-lg font-bold tracking-widest uppercase">{fr.assessment.failedStamp}</span>
	<span class="text-sm italic">{fr.assessment.failedStampHint}</span>
</p>
