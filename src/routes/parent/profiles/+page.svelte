<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import { createChildProfile, listProfiles } from '#lib/data/family.ts';
	import { GRADES, type Grade, type Profile, type WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';

	let profiles = $state<WithId<Profile>[]>([]);
	let firstName = $state('');
	let grade = $state<Grade>('6e');
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);

	let children = $derived(profiles.filter((p) => p.role === 'child'));

	async function refresh() {
		if (session.familyId) profiles = await listProfiles(session.familyId);
	}

	$effect(() => {
		if (session.isAdmin) void refresh();
	});

	async function addChild(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = null;
		const name = firstName.trim();
		if (!name) {
			errorMessage = fr.profiles.firstNameRequired;
			return;
		}
		if (!session.familyId) return;

		saving = true;
		try {
			await createChildProfile(session.familyId, name, grade);
			firstName = '';
			await refresh();
		} catch (error) {
			console.error('[profiles] create failed', error);
			errorMessage = fr.profiles.createFailed;
		} finally {
			saving = false;
		}
	}
</script>

<main class="stack">
	<h1>{fr.profiles.title}</h1>

	{#if !session.isAdmin}
		<p class="error">{fr.parent.adminOnly}</p>
	{:else}
		<section class="card stack">
			<h2>{fr.profiles.children}</h2>
			{#if children.length === 0}
				<p class="muted">{fr.profiles.noChildren}</p>
			{:else}
				<ul class="profile-list">
					{#each children as child (child.id)}
						<li><strong>{child.firstName}</strong> <span class="muted">{child.grade}</span></li>
					{/each}
				</ul>
			{/if}
		</section>

		<form class="card stack" onsubmit={addChild}>
			<h2>{fr.profiles.addChild}</h2>
			<label>
				{fr.profiles.firstName}
				<input bind:value={firstName} autocomplete="off" maxlength="40" />
			</label>
			<label>
				{fr.profiles.grade}
				<select bind:value={grade}>
					{#each GRADES as g (g)}<option value={g}>{g}</option>{/each}
				</select>
			</label>
			{#if errorMessage}<p class="error">{errorMessage}</p>{/if}
			<button class="primary" type="submit" disabled={saving}>
				{saving ? fr.profiles.creating : fr.profiles.create}
			</button>
		</form>
	{/if}
</main>

<style>
	.profile-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: var(--space-2);
	}
</style>
