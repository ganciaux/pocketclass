<script lang="ts">
	import type { Snippet } from 'svelte';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import type { Subject } from '#lib/data/types.ts';

	/**
	 * Top of a chapter's page, the same for the child (`/chapter/[id]`) and the parent
	 * (`/parent/chapters/[id]`): the subject's picture (a link to the subject page of the same
	 * view), the chapter's part and title. `action`: the switch to the other view, on the right.
	 */
	let {
		title,
		group,
		subject,
		subjectHref,
		action
	}: {
		title: string;
		group: string | null;
		subject: ({ id: string } & Pick<Subject, 'name' | 'color' | 'icon' | 'image'>) | null;
		subjectHref: string;
		action?: Snippet;
	} = $props();
</script>

<header class="flex flex-wrap items-center gap-3">
	{#if subject}
		<a class="link-icon" href={subjectHref} title={subject.name} aria-label={subject.name}>
			<SubjectBadge {subject} size={2.5} />
		</a>
	{/if}
	<!-- Wide enough for the title: on a phone the action goes under it, on the right. -->
	<div class="flex min-w-0 flex-1 basis-56 flex-col">
		{#if group}<span class="text-sm font-bold text-base-content/60">{group}</span>{/if}
		<h1 class="hyphens-auto">{title}</h1>
	</div>
	{#if action}<span class="ms-auto">{@render action()}</span>{/if}
</header>
