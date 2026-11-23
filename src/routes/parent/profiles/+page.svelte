<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import LoadState from '#lib/components/LoadState.svelte';
	import { createChildProfile, watchChildProfiles } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { GRADES, type Grade } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';

	const t = fr.profiles;
	const childProfiles = live(() => session.familyId && watchChildProfiles(session.familyId));

	let firstName = $state('');
	let grade = $state<Grade>('6e');
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);

	async function addChild(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = null;
		const name = firstName.trim();
		if (!name) {
			errorMessage = t.firstNameRequired;
			return;
		}
		if (!session.familyId) return;

		// Clear now: the live list shows the new child immediately (local write), and the user
		// may type the next name before the server acknowledges.
		firstName = '';
		saving = true;
		try {
			await createChildProfile(session.familyId, name, grade);
		} catch (error) {
			console.error('[profiles] create failed', error);
			firstName = name;
			errorMessage = t.createFailed;
		} finally {
			saving = false;
		}
	}
</script>

<main class="stack">
	<h1>{t.title}</h1>

	<section class="card stack">
		<h2>{t.children}</h2>
		<LoadState source={childProfiles} notFound="" failed={t.loadFailed}>
			{#snippet children(list)}
				<ul class="list plain">
					{#each list as child (child.id)}
						<li><strong>{child.firstName}</strong> <span class="muted">{child.grade}</span></li>
					{:else}
						<li class="muted">{t.noChildren}</li>
					{/each}
				</ul>
			{/snippet}
		</LoadState>
	</section>

	<form class="card stack" onsubmit={addChild}>
		<h2>{t.addChild}</h2>
		<label>
			{t.firstName}
			<input bind:value={firstName} autocomplete="off" maxlength="40" />
		</label>
		<label>
			{fr.common.grade}
			<select bind:value={grade}>
				{#each GRADES as g (g)}<option value={g}>{g}</option>{/each}
			</select>
		</label>
		{#if errorMessage}<p class="error">{errorMessage}</p>{/if}
		<button class="primary" type="submit" disabled={saving}>
			{saving ? t.creating : t.create}
		</button>
	</form>
</main>
