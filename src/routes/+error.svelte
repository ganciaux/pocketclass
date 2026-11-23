<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<main class="stack">
	<p class="error">{page.status === 404 ? fr.app.notFound : fr.app.error}</p>
	<a href={resolve('/')}>{fr.app.home}</a>
</main>
