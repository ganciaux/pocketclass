<script lang="ts">
	import { fr } from '#lib/i18n/fr.ts';
	import { toast } from '#lib/motion.ts';
	import { appUpdate } from '#lib/update.svelte.ts';

	/** "A new version is available": shown when the service worker has one waiting. */
	const t = fr.update;
	let applying = $state(false);

	async function apply() {
		applying = true;
		await appUpdate.apply();
	}
</script>

{#if appUpdate.available}
	<div class="toast toast-center toast-bottom z-20 mb-[env(safe-area-inset-bottom)]">
		<div role="status" class="alert alert-info shadow-lg" in:toast out:toast={{ exit: true }}>
			<span>{t.available}</span>
			<div class="flex gap-1">
				<button class="btn btn-ghost btn-sm" onclick={() => appUpdate.dismiss()}>{t.later}</button>
				<button class="btn btn-primary btn-sm" onclick={apply} disabled={applying}>
					{t.apply}
				</button>
			</div>
		</div>
	</div>
{/if}
