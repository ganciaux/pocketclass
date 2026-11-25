<script lang="ts">
	import type { SheetState } from '#lib/binder/binder.ts';
	import { STATUS_BADGE } from '#lib/binder/colors.ts';
	import { fr } from '#lib/i18n/fr.ts';

	let { state }: { state: SheetState } = $props();
</script>

<span class={['badge badge-sm shrink-0', STATUS_BADGE[state]]}>{fr.binder.state[state]}</span>
