<script lang="ts">
	import { isAcquired } from '#lib/binder/binder.ts';
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { live } from '#lib/data/live.svelte.ts';
	import { setAcquired, watchConceptProgress } from '#lib/data/progress.ts';
	import type { ConceptRecord, Profile, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { displayName } from '#lib/profile/display.ts';

	/** Parent: stamps (or unstamps) `sheet` as acquired for one child. Works offline. */
	let {
		familyId,
		child,
		sheet
	}: { familyId: string; child: WithId<Profile>; sheet: WithId<ConceptRecord> } = $props();

	const childId = $derived(child.id);
	const sheetId = $derived(sheet.id);
	const progressLive = live(() => watchConceptProgress(familyId, childId, sheetId));
	const acquired = $derived(isAcquired(progressLive.data ?? undefined));
	const name = $derived(displayName(child));
</script>

<button
	class={['btn gap-2', acquired ? 'btn-primary' : 'btn-outline']}
	aria-pressed={acquired}
	title={fr.stamp.toggle(name, acquired)}
	disabled={progressLive.status === 'loading'}
	onclick={() => setAcquired(familyId, child.id, sheet, !acquired)}
>
	<Avatar profile={child} size={1.5} />
	{name}
	{#if acquired}<Icon paths={UI_ICONS.star} class="size-4" />{/if}
</button>
