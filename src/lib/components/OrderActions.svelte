<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';

	/** Parent list row actions: move up / down, hide from children or show again. */
	let {
		first,
		last,
		archived,
		onmove,
		onarchive
	}: {
		first: boolean;
		last: boolean;
		archived: boolean;
		onmove: (step: -1 | 1) => void;
		onarchive: (archived: boolean) => void;
	} = $props();

	const t = fr.manage;
</script>

<span class="flex shrink-0 items-center gap-1">
	<button
		class="btn btn-square btn-ghost btn-xs"
		title={t.moveUp}
		aria-label={t.moveUp}
		disabled={first}
		onclick={() => onmove(-1)}
	>
		↑
	</button>
	<button
		class="btn btn-square btn-ghost btn-xs"
		title={t.moveDown}
		aria-label={t.moveDown}
		disabled={last}
		onclick={() => onmove(1)}
	>
		↓
	</button>
	<button class="btn btn-ghost btn-xs" onclick={() => onarchive(!archived)}>
		{archived ? t.show : t.hide}
	</button>
</span>
