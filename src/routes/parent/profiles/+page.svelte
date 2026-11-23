<script lang="ts">
	import { session } from '#lib/auth.svelte.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import { createChildProfile, watchChildProfiles } from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { GRADES, type Grade } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { displayName } from '#lib/profile/display.ts';
	import { resolve } from '$app/paths';

	const t = fr.profiles;
	const childProfilesLive = live(() => session.familyId && watchChildProfiles(session.familyId));

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

<main>
	<h1>{t.title}</h1>

	<section class="flex flex-col gap-2">
		<h2>{t.children}</h2>
		<LoadState source={childProfilesLive} failed={t.loadFailed}>
			{#snippet children(list)}
				<ul class="flex flex-col gap-2">
					{#each list as child (child.id)}
						<li>
							<a
								class="card card-border bg-base-100 transition-colors hover:border-primary"
								href={resolve('/parent/profiles/[id]', { id: child.id })}
							>
								<div class="card-body flex-row items-center gap-3 py-3">
									<Avatar profile={child} size={2.5} />
									<strong class="flex-1">{displayName(child)}</strong>
									<span class="badge badge-secondary badge-sm">{child.grade}</span>
								</div>
							</a>
						</li>
					{:else}
						<li class="text-base-content/70">{t.noChildren}</li>
					{/each}
				</ul>
			{/snippet}
		</LoadState>
	</section>

	<form class="card card-border bg-base-100" onsubmit={addChild}>
		<div class="card-body gap-3">
			<h2 class="card-title">{t.addChild}</h2>
			<label class="fieldset">
				<span class="fieldset-legend">{t.firstName}</span>
				<input class="input w-full" bind:value={firstName} autocomplete="off" maxlength="40" />
			</label>
			<label class="fieldset">
				<span class="fieldset-legend">{fr.common.grade}</span>
				<select class="select w-full" bind:value={grade}>
					{#each GRADES as g (g)}<option value={g}>{g}</option>{/each}
				</select>
			</label>
			{#if errorMessage}<p role="alert" class="alert alert-error alert-soft">{errorMessage}</p>{/if}
			<button class="btn btn-primary self-start" type="submit" disabled={saving}>
				{saving ? t.creating : t.create}
			</button>
		</div>
	</form>
</main>
