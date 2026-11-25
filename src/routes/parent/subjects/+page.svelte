<script lang="ts">
	import BackLink from '#lib/components/BackLink.svelte';
	import BackupRestore from '#lib/components/BackupRestore.svelte';
	import ExportButton from '#lib/components/ExportButton.svelte';
	import { exportBinder } from '#lib/data/catalogExport.ts';
	import { exportFileName } from '#lib/import/catalogExport.ts';
	import { session } from '#lib/auth.svelte.ts';
	import { freeColor, moveItem, nextOrder } from '#lib/binder/binder.ts';
	import SubjectBadge from '#lib/components/SubjectBadge.svelte';
	import LoadState from '#lib/components/LoadState.svelte';
	import OrderActions from '#lib/components/OrderActions.svelte';
	import { watchSubjects } from '#lib/data/catalog.ts';
	import { createSubject, saveOrder, setArchived } from '#lib/data/catalogEdit.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { GRADES, type Grade, type Subject, type WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { reorder, row } from '#lib/motion.ts';
	import { resolve } from '$app/paths';

	const t = fr.manage;
	const subjectsLive = live(() => session.familyId && watchSubjects(session.familyId));

	let name = $state('');
	let grade = $state<Grade>('3e');
	let nameMissing = $state(false);

	const ofGrade = (subjects: WithId<Subject>[], g: Grade) => subjects.filter((s) => s.grade === g);
	/** One list per grade, then the subjects without a known grade (old path import). */
	const sections = (subjects: WithId<Subject>[]) => [
		...GRADES.map((g) => ({ heading: g as string, list: ofGrade(subjects, g) })),
		{ heading: t.otherSubjects, list: subjects.filter((s) => !GRADES.includes(s.grade)) }
	];

	function create(event: SubmitEvent, subjects: WithId<Subject>[]) {
		event.preventDefault();
		const familyId = session.familyId;
		nameMissing = !name.trim();
		if (!familyId || nameMissing) return;
		const siblings = ofGrade(subjects, grade);
		createSubject(familyId, {
			name: name.trim(),
			grade,
			color: freeColor(subjects),
			order: nextOrder(siblings)
		});
		name = '';
	}

	function move(list: WithId<Subject>[], id: string, step: -1 | 1) {
		if (session.familyId) saveOrder(session.familyId, 'subjects', moveItem(list, id, step));
	}
</script>

<svelte:head><title>{t.title} · {fr.app.name}</title></svelte:head>

<main>
	<BackLink href={resolve('/')} label={fr.app.home} />
	<h1>{t.title}</h1>
	<p class="text-base-content/70">{t.help}</p>

	<LoadState source={subjectsLive} failed={fr.binder.loadFailed}>
		{#snippet children(subjects)}
			{#each sections(subjects) as { heading, list } (heading)}
				{#if list.length > 0}
					<section class="card card-border bg-base-100">
						<div class="card-body gap-2">
							<h2 class="card-title">{heading}</h2>
							<ul class="flex flex-col divide-y divide-base-300">
								{#each list as subject, i (subject.id)}
									<li
										class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
										in:row
										out:row={{ exit: true }}
										animate:reorder
									>
										<SubjectBadge {subject} size={2.5} />
										<a
											class={[
												'min-w-0 flex-1 basis-20 font-bold hover:underline',
												subject.archived && 'text-base-content/50'
											]}
											href={resolve('/parent/subjects/[id]', { id: subject.id })}
										>
											{subject.name}
										</a>
										{#if subject.archived}
											<span class="badge badge-ghost badge-sm">{t.hidden}</span>
										{/if}
										<OrderActions
											first={i === 0}
											last={i === list.length - 1}
											archived={subject.archived}
											onmove={(step) => move(list, subject.id, step)}
											onarchive={(archived) =>
												session.familyId &&
												setArchived(session.familyId, 'subjects', subject.id, archived)}
										/>
									</li>
								{/each}
							</ul>
						</div>
					</section>
				{/if}
			{/each}
			{#if subjects.length === 0}<p class="text-base-content/70">{t.noSubjects}</p>{/if}

			<form class="card card-border bg-base-100" onsubmit={(e) => create(e, subjects)}>
				<div class="card-body gap-3">
					<h2 class="card-title">{t.newSubject}</h2>
					<div class="grid gap-3 sm:grid-cols-[1fr_auto]">
						<label class="fieldset">
							<span class="fieldset-legend">{t.subjectName}</span>
							<input
								class="input w-full"
								bind:value={name}
								placeholder={t.subjectPlaceholder}
								maxlength="40"
							/>
						</label>
						<label class="fieldset">
							<span class="fieldset-legend">{fr.common.grade}</span>
							<select class="select w-full" bind:value={grade}>
								{#each GRADES as g (g)}<option value={g}>{g}</option>{/each}
							</select>
						</label>
					</div>
					{#if nameMissing}<p role="alert" class="text-sm text-error">{t.nameRequired}</p>{/if}
					<button class="btn btn-primary self-start" type="submit">{t.create}</button>
				</div>
			</form>
		{/snippet}
	</LoadState>

	{#if session.familyId}
		{@const familyId = session.familyId}
		<!-- Backup: every binder in one file, and its restore. -->
		<ExportButton
			label={fr.export.binder}
			fileName={exportFileName('classeurs', '')}
			load={() => exportBinder(familyId)}
		/>
		<BackupRestore {familyId} />
	{/if}
</main>
