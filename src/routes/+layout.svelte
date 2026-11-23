<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { fr } from '#lib/i18n/fr.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{fr.app.name}</title>
</svelte:head>

{@render children()}
