<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<main>
	<p role="alert" class="alert alert-error alert-soft">
		{page.status === 404 ? fr.app.notFound : fr.app.error}
	</p>
	<a class="btn btn-soft btn-primary self-start" href={resolve('/')}>{fr.app.home}</a>
</main>
