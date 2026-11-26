<script lang="ts">
	import { STATUS_CHIP } from '#lib/binder/colors.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { readTheme, setTheme, THEME_CHOICES, type ThemeChoice } from '#lib/theme.ts';

	/** « Mon profil »: day / night, or follow the phone (this device only). */
	const t = fr.theme;
	let current = $state<ThemeChoice>(readTheme());

	function choose(choice: ThemeChoice) {
		current = choice;
		setTheme(choice);
	}
</script>

<section class="card card-border bg-base-100">
	<div class="card-body gap-3">
		<h2 class="card-title">{t.title}</h2>
		<div class="join self-start" role="group" aria-label={t.title}>
			{#each THEME_CHOICES as choice (choice)}
				<button
					class={[
						'join-item btn btn-sm',
						current === choice ? STATUS_CHIP.all.on : STATUS_CHIP.all.off
					]}
					aria-pressed={current === choice}
					onclick={() => choose(choice)}
				>
					{t.choice[choice]}
				</button>
			{/each}
		</div>
		<p class="text-sm text-base-content/60">{t.help}</p>
	</div>
</section>
