<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SUBJECT_TINT } from '#lib/binder/colors.ts';
	import PointsStar from '#lib/components/PointsStar.svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import type { Subject } from '#lib/data/types.ts';

	/**
	 * Top of a subject's page, the same for the child (`/subject/[id]`) and the parent
	 * (`/parent/subjects/[id]`): a banner in the subject's colour with its picture, name and size.
	 * `action`: the switch to the other view (« Gérer » / « Voir comme l'enfant »), bottom right;
	 * `children`: what follows (the child's progress). The grade is never shown here: the binder
	 * already belongs to one.
	 */
	let {
		subject,
		meta,
		points = 0,
		action,
		children
	}: {
		subject: { id: string } & Pick<Subject, 'name' | 'color' | 'icon' | 'image'>;
		/** « 3 chapitres · 7 fiches » */
		meta: string;
		/** Points earned in this binder (child view): the star sticker on the corner. */
		points?: number;
		action?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<header class={['card relative', SUBJECT_TINT[subject.color]]}>
	{#if points > 0}
		<PointsStar {points} class="absolute -top-4 -right-2 z-10 rotate-12" />
	{/if}
	<div class="card-body gap-3">
		<div class="flex items-center gap-4">
			<SubjectBadge {subject} size={4} />
			<!-- French hyphenation: a long name breaks between syllables, not anywhere. -->
			<h1 class="min-w-0 flex-1 hyphens-auto">{subject.name}</h1>
		</div>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="text-sm text-base-content/70">{meta}</span>
			{#if action}<span class="ms-auto">{@render action()}</span>{/if}
		</div>
		{@render children?.()}
	</div>
</header>
