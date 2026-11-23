/**
 * Every user-facing string lives here. Code identifiers stay in English;
 * only the displayed text is French.
 */
export const fr = {
	app: {
		name: 'PocketClass',
		tagline: 'Tes fiches de révision, dans la poche.',
		offline: 'Hors-ligne',
		loading: 'Chargement…',
		back: 'Retour',
		soon: 'bientôt',
		home: 'Accueil'
	},
	auth: {
		signInWithGoogle: 'Se connecter avec Google',
		signOut: 'Se déconnecter',
		signInFailed: 'La connexion a échoué. Réessaie.',
		loadFailed: 'Impossible de charger ta famille. Vérifie ta connexion, puis recharge la page.',
		notLinked: "Cet appareil n'est relié à aucune famille.",
		hello: (firstName: string) => `Bonjour ${firstName} !`
	},
	home: {
		parentSection: 'Espace parent',
		importPath: 'Importer un parcours',
		manageProfiles: 'Gérer les profils',
		assignedPaths: 'Parcours affectés',
		familyPaths: 'Parcours de la famille',
		noAssignedPaths: 'Aucun parcours affecté pour le moment.',
		noFamilyPaths: 'Aucun parcours importé pour le moment.',
		version: (v: number) => `version ${v}`
	},
	map: {
		notFound: "Ce parcours n'existe pas (ou plus).",
		loadFailed: 'Impossible de charger le parcours.',
		todo: 'à faire',
		emptyTopic: 'Rien pour le moment'
	},
	concept: {
		notFound: "Cette notion n'existe pas (ou plus).",
		loadFailed: 'Impossible de charger la fiche.',
		keyPoints: "L'essentiel",
		examples: 'Exemples',
		showSolution: 'Voir la solution',
		pitfalls: 'Pièges à éviter',
		practice: "S'entraîner",
		assessment: 'Contrôle',
		backToMap: 'Retour à la carte'
	},
	profiles: {
		title: 'Profils',
		children: 'Enfants',
		noChildren: "Aucun profil enfant pour l'instant.",
		addChild: 'Ajouter un enfant',
		firstName: 'Prénom',
		grade: 'Niveau',
		create: 'Créer le profil',
		creating: 'Création…',
		createFailed: "Le profil n'a pas pu être créé.",
		firstNameRequired: 'Indique un prénom.',
		roleAdmin: 'Parent',
		roleChild: 'Enfant'
	},
	parent: {
		adminOnly: 'Cette page est réservée aux parents.'
	},
	import: {
		title: 'Importer un parcours',
		help: "Colle ici le JSON produit par l'IA (format pocketclass/path@1).",
		placeholder: '{ "format": "pocketclass/path@1", … }',
		loadSample: "Charger l'exemple",
		sampleFailed: "Impossible de charger l'exemple.",
		preview: 'Aperçu',
		errorsTitle: 'Le JSON contient des erreurs',
		warningsTitle: "Remarques de l'IA",
		version: 'Version',
		versionNew: (v: number) => `${v} (nouveau parcours)`,
		versionUpdate: (from: number, to: number) => `${from} → ${to} (mise à jour)`,
		grade: 'Niveau',
		subject: 'Matière',
		type: 'Type',
		types: { brevet: 'Brevet', test: 'Contrôle', lessons: 'Leçons' },
		topicEmpty: 'aucune notion pour le moment',
		conceptLine: (keyPoints: number, practice: number, assessment: number) =>
			`${keyPoints} points-clés · ${practice} exercices d'entraînement · ${assessment} de contrôle`,
		assignTo: 'Affecter à',
		noChildren: "Crée d'abord un profil enfant pour pouvoir affecter le parcours.",
		submit: 'Importer',
		importing: 'Import en cours…',
		failed: "L'import a échoué. Vérifie ta connexion et réessaie.",
		done: (concepts: number, exercises: number) =>
			`Import terminé : ${concepts} notions, ${exercises} exercices.`,
		archived: (concepts: number, exercises: number) =>
			`Archivés car absents du nouveau fichier : ${concepts} notions, ${exercises} exercices.`,
		openPath: 'Voir la carte du parcours'
	},
	validation: {
		slug: 'identifiant invalide : lettres minuscules, chiffres, « - » ou « _ » uniquement',
		numberOrFraction:
			'réponse invalide : un nombre (ex. 3 ou 2,5) ou une fraction « a/b » est attendu',
		clozeNoBlank: 'le texte doit contenir au moins un trou [[…]]',
		clozeEmptyBlank: 'un trou [[ ]] est vide',
		duplicateId: (id: string) => `l'identifiant « ${id} » est utilisé plusieurs fois`,
		unknownRef: (id: string, where: string) => `« ${id} » n'existe pas dans ${where}`,
		scoreTooHigh: 'score.acquired ne peut pas dépasser score.total',
		root: 'document',
		invalidJson: "Ce texte n'est pas un JSON valide.",
		noJsonObject: 'Aucun objet JSON trouvé (il doit commencer par « { » et finir par « } »).'
	}
} as const;
