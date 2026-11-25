<script lang="ts">
	import { UI_ICONS } from '#lib/binder/icons.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { setAssessmentSettings } from '#lib/data/catalogEdit.ts';
	import { live } from '#lib/data/live.svelte.ts';
	import { watchAssessment } from '#lib/data/practice.ts';
	import type { ConceptRecord, WithId } from '#lib/data/types.ts';
	import { fr } from '#lib/i18n/fr.ts';
	import { settingsOf } from '#lib/practice/assessment.ts';

	/**
	 * Parent, on a sheet: the assessment's pass rate and points. An empty field means the default;
	 * the settings survive a new import of the sheet.
	 */
	let { familyId, sheet }: { familyId: string; sheet: WithId<ConceptRecord> } = $props();

	const t = fr.assessment;
	const sheetId = $derived(sheet.id);
	const assessmentLive = live(() => watchAssessment(familyId, sheetId));
	const defaults = $derived(settingsOf(null, sheet.keyPoints.length));

	let passRate = $state('');
	let points = $state('');
	let saved = $state(false);

	// The stored values (empty = default), again when they change elsewhere.
	$effect(() => {
		const assessment = assessmentLive.data;
		passRate = assessment?.passRate?.toString() ?? '';
		points = assessment?.points?.toString() ?? '';
	});

	/** An integer in range, or null (default) when empty or invalid. */
	function parse(value: string | number, min: number, max: number): number | null {
		const n = Number(value);
		return String(value).trim() !== '' && Number.isInteger(n) && n >= min && n <= max ? n : null;
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		setAssessmentSettings(familyId, sheetId, {
			passRate: parse(passRate, 1, 100),
			points: parse(points, 0, 1000)
		});
		saved = true;
	}

	function reset() {
		setAssessmentSettings(familyId, sheetId, { passRate: null, points: null });
		saved = true;
	}
</script>

<section class="card card-border bg-base-100">
	<form class="card-body gap-3" onsubmit={save}>
		<h2 class="card-title">
			<Icon paths={UI_ICONS.clipboard} class="size-5 text-primary" />
			{t.settingsTitle}
		</h2>
		<p class="text-sm text-base-content/70">{t.settingsHelp(defaults.passRate, defaults.points)}</p>
		<div class="grid grid-cols-2 gap-3">
			<label class="fieldset">
				<span class="fieldset-legend">{t.passRate}</span>
				<input
					class="input w-full"
					type="number"
					min="1"
					max="100"
					inputmode="numeric"
					placeholder={String(defaults.passRate)}
					bind:value={passRate}
					oninput={() => (saved = false)}
				/>
			</label>
			<label class="fieldset">
				<span class="fieldset-legend">{t.points}</span>
				<input
					class="input w-full"
					type="number"
					min="0"
					max="1000"
					inputmode="numeric"
					placeholder={String(defaults.points)}
					bind:value={points}
					oninput={() => (saved = false)}
				/>
			</label>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<button class="btn btn-primary" type="submit">{t.save}</button>
			<button class="btn btn-ghost" type="button" onclick={reset}>{t.reset}</button>
			{#if saved}<span class="text-sm text-success" role="status">{t.saved}</span>{/if}
		</div>
	</form>
</section>
