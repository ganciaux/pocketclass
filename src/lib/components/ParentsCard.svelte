<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import { canRemoveParent, inviteEmail } from '#lib/account/parents.ts';
	import { session } from '#lib/auth.svelte.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import {
		cancelInvite,
		inviteParent,
		removeParent,
		watchFamily,
		watchInvites,
		watchParentProfiles
	} from '#lib/data/family.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { combine } from '#lib/data/sources.ts';
	import type { Profile, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { connectivity } from '#lib/online.svelte.ts';
	import { displayName } from '#lib/profile/display.ts';

	/**
	 * The family's parents (equal rights): remove one, leave, invite another by e-mail. Online
	 * actions, awaited. The parent who created the family and the last parent cannot leave.
	 */
	let { familyId }: { familyId: string } = $props();

	const t = fr.parents;
	const parentsLive = live(() =>
		combine({
			family: watchFamily(familyId),
			profiles: watchParentProfiles(familyId),
			invites: watchInvites(familyId)
		})
	);

	let email = $state('');
	let sending = $state(false);
	let error = $state<string | null>(null);
	let removing = $state<WithId<Profile> | null>(null);

	async function invite(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		const address = inviteEmail(email);
		if (!address) {
			error = t.invalidEmail;
			return;
		}
		const me = session.profile;
		if (!me) return;
		// Already a parent here: their Google e-mail is only known for the signed-in parent.
		if (address === session.user?.email?.toLowerCase()) {
			error = t.alreadyParent;
			return;
		}
		sending = true;
		try {
			await inviteParent(familyId, address, { uid: me.id, name: displayName(me) });
			email = '';
		} catch (failure) {
			console.error('[parents] invite', failure);
			error = t.inviteFailed;
		} finally {
			sending = false;
		}
	}

	async function remove(parent: WithId<Profile>) {
		error = null;
		try {
			if (parent.id === session.profileId) await session.leaveFamily();
			else await removeParent(familyId, parent.id, false);
		} catch (failure) {
			console.error('[parents] remove', failure);
			error = t.actionFailed;
		}
	}

	/**
	 * One row per admin. An admin whose profile is gone (a removal cut half-way) still shows,
	 * so « Retirer » can finish it.
	 */
	function parentsOf(admins: string[], profiles: WithId<Profile>[]): WithId<Profile>[] {
		return admins.map(
			(id) =>
				profiles.find((p) => p.id === id) ?? {
					id,
					firstName: t.missingProfile,
					role: 'admin',
					grade: null,
					points: 0
				}
		);
	}

	async function cancel(address: string) {
		error = null;
		try {
			await cancelInvite(address);
		} catch (failure) {
			console.error('[parents] cancel invite', failure);
			error = t.actionFailed;
		}
	}
</script>

<section class="card card-border bg-base-100">
	<div class="card-body gap-3">
		<h2 class="card-title">{t.title}</h2>
		<p class="text-sm text-base-content/70">{t.help}</p>
		<LoadState source={parentsLive} failed={t.loadFailed}>
			{#snippet children({ family, profiles, invites })}
				{@const admins = family?.admins ?? []}
				<ul class="flex flex-col divide-y divide-base-300">
					{#each parentsOf(admins, profiles) as parent (parent.id)}
						{@const isMe = parent.id === session.profileId}
						<li class="flex flex-wrap items-center gap-3 py-2">
							<Avatar profile={parent} size={2.5} />
							<span class="flex min-w-0 flex-1 flex-col">
								<strong class="truncate">
									{displayName(parent)}
									{#if isMe}<span class="badge badge-ghost badge-sm">{t.you}</span>{/if}
								</strong>
								{#if parent.id === familyId}
									<span class="text-sm text-base-content/60">{t.creator}</span>
								{/if}
							</span>
							{#if canRemoveParent(familyId, admins, parent.id)}
								<button
									class="btn btn-soft btn-error btn-sm"
									disabled={!connectivity.online}
									onclick={() => (removing = parent)}
								>
									<Icon paths={isMe ? UI_ICONS.signOut : UI_ICONS.trash} class="size-4" />
									{isMe ? t.leave : t.remove}
								</button>
							{/if}
						</li>
					{/each}
				</ul>

				{#if invites.length > 0}
					<h3 class="font-bold">{t.pending}</h3>
					<ul class="flex flex-col divide-y divide-base-300">
						{#each invites as pending (pending.id)}
							<li class="flex flex-wrap items-center gap-2 py-2">
								<span class="min-w-0 flex-1 truncate">{pending.id}</span>
								<button
									class="btn btn-soft btn-error btn-sm"
									disabled={!connectivity.online}
									onclick={() => cancel(pending.id)}
								>
									<Icon paths={UI_ICONS.x} class="size-4" />
									{t.cancel}
								</button>
							</li>
						{/each}
					</ul>
				{/if}

				<form class="flex flex-col gap-2" onsubmit={invite} novalidate>
					<label class="fieldset">
						<span class="fieldset-legend">{t.invite}</span>
						<input
							class="input w-full"
							type="email"
							bind:value={email}
							placeholder={t.email}
							autocomplete="off"
							autocapitalize="off"
						/>
						<span class="text-sm text-base-content/60">{t.inviteHelp}</span>
					</label>
					{#if !connectivity.online}
						<p class="alert alert-soft">{t.offline}</p>
					{/if}
					<button
						class="btn btn-primary self-start"
						type="submit"
						disabled={sending || !connectivity.online}
					>
						{sending ? t.sending : t.send}
					</button>
				</form>
				{#if error}<p role="alert" class="alert alert-error alert-soft">{error}</p>{/if}
			{/snippet}
		</LoadState>
	</div>
</section>

{#if removing}
	{@const parent = removing}
	{@const isMe = parent.id === session.profileId}
	<ConfirmDialog
		title={isMe ? t.leaveTitle : t.removeTitle(displayName(parent))}
		message={isMe ? t.leaveMessage : t.removeMessage}
		confirmLabel={isMe ? t.leave : t.remove}
		danger
		onconfirm={() => remove(parent)}
		onclose={() => (removing = null)}
	/>
{/if}
