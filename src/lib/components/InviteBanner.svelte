<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import { session } from '#lib/auth.svelte.ts';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { fr } from '#lib/i18n/fr.ts';
	import { connectivity } from '#lib/online.svelte.ts';

	/**
	 * A parent already in a family, invited by another one (`session.pendingInvite`): join it
	 * (after a warning) or decline. Home page, parent view.
	 */
	const t = fr.parents;
	let asking = $state(false);
	let error = $state<string | null>(null);

	async function run(action: () => Promise<void>) {
		error = null;
		try {
			await action();
		} catch (failure) {
			console.error('[invite]', failure);
			error = t.actionFailed;
		}
	}
</script>

{#if session.pendingInvite}
	{@const invite = session.pendingInvite}
	<section class="alert alert-info alert-soft flex flex-col items-start gap-3" role="status">
		<p class="flex items-center gap-2">
			<Icon paths={UI_ICONS.users} class="size-5 shrink-0" />
			{t.banner(invite.invitedByName)}
		</p>
		<div class="flex flex-wrap gap-2">
			<button
				class="btn btn-primary btn-sm"
				disabled={!connectivity.online}
				onclick={() => (asking = true)}
			>
				{t.join}
			</button>
			<button
				class="btn btn-ghost btn-sm"
				disabled={!connectivity.online}
				onclick={() => run(() => session.declineInvite())}
			>
				{t.decline}
			</button>
		</div>
		{#if error}<p role="alert" class="alert alert-error alert-soft">{error}</p>{/if}
	</section>
	{#if asking}
		<ConfirmDialog
			title={t.joinTitle(invite.invitedByName)}
			message={t.joinMessage}
			confirmLabel={t.join}
			onconfirm={() => run(() => session.joinInvite())}
			onclose={() => (asking = false)}
		/>
	{/if}
{/if}
