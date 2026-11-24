<script lang="ts">
	/**
	 * "Back" at the top of a page: a pill with a chevron and the name of the page it leads to.
	 * A real link to the parent page, not `history.back()`: a deep link or a PWA launch has no
	 * history to go back to.
	 */
	let { href, label }: { href: string; label: string } = $props();
</script>

<a class="btn back-link h-11 max-w-full self-start rounded-full ps-2 pe-4 font-normal" {href}>
	<svg
		aria-hidden="true"
		class="size-5 shrink-0"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="m15 18-6-6 6-6" />
	</svg>
	<span class="truncate">{label}</span>
</a>
