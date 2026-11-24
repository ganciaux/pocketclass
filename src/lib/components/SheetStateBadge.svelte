<script lang="ts">
	import type { SheetState } from '#lib/binder/binder.ts';
	import { fr } from '#lib/i18n/fr.ts';

	let { state }: { state: SheetState } = $props();

	const style: Record<SheetState, string> = {
		new: 'badge-secondary',
		updated: 'badge-warning',
		read: 'badge-success badge-soft',
		opened: 'badge-ghost'
	};
</script>

<span class={['badge badge-sm shrink-0', style[state]]}>{fr.binder.state[state]}</span>
