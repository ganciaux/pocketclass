<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';

	/**
	 * "Back" at the top of a page: a pill with a chevron and the name of the page it leads to.
	 * A real link to the parent page, not `history.back()`: a deep link or a PWA launch has no
	 * history to go back to.
	 */
	let { href, label }: { href: string; label: string } = $props();
</script>

<a
	class="btn btn-soft btn-primary back-link h-11 max-w-full self-start rounded-full ps-2 pe-4 font-normal"
	{href}
>
	<Icon paths={UI_ICONS.chevronLeft} />
	<span class="truncate">{label}</span>
</a>
