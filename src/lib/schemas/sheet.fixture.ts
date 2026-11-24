/** Smallest valid sheet, as plain JSON (defaults omitted). */
export function minimalSheet() {
	return {
		format: 'pocketclass/sheet@1',
		id: 'maths-3e-fractions',
		title: 'Fractions',
		keyPoints: [
			{ id: 'kp-simplify', label: 'Simplifier' },
			{ id: 'kp-add', label: 'Additionner' }
		],
		sheet: {
			sections: [{ title: 'Règle', text: 'Texte $\\frac{1}{2}$', keyPoints: ['kp-simplify'] }]
		},
		exercises: [
			{
				id: 'ex-1',
				usage: 'practice',
				keyPoint: 'kp-simplify',
				type: 'calculation',
				statement: 'Simplifier 2/4',
				answer: '1/2'
			},
			{
				id: 'ex-2',
				usage: 'assessment',
				keyPoint: 'kp-add',
				type: 'cloze',
				text: '1/3 + 1/3 = [[2/3]]'
			}
		],
		assessment: {
			type: 'brevet',
			draw: { perKeyPoint: 2 },
			exerciseIds: ['ex-2'],
			paper: { instruction: 'Résous', rubric: [{ keyPoint: 'kp-add', criterion: 'Juste' }] }
		}
	};
}
