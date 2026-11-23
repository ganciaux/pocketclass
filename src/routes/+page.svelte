<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';
</script>

<main class="stack">
	<h1>{fr.auth.hello(session.profile?.firstName ?? '')}</h1>

	{#if session.isAdmin}
		<section class="card stack">
			<h2>{fr.home.parentSection}</h2>
			<div class="row">
				<a class="button" href={resolve('/parent/profiles')}>{fr.home.manageProfiles}</a>
			</div>
		</section>
	{/if}
</main>
