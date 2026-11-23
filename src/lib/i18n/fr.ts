/**
 * Every user-facing string lives here. Code identifiers stay in English;
 * only the displayed text is French.
 */

/** French count: 0 and 1 are singular. `plural(2, 'notion')` → "2 notions". */
export function plural(count: number, one: string, many = `${one}s`): string {
	return `${count} ${count < 2 ? one : many}`;
}

/** "23 novembre" (Firestore timestamps: `ts.toDate()`). */
export const formatDate = (date: Date) =>
	date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export const fr = {
	app: {
		name: 'PocketClass',
		tagline: 'Tes fiches de révision, dans la poche.',
		offline: 'Hors-ligne',
		loading: 'Chargement…',
		soon: 'bientôt'
	},
	common: {
		grade: 'Niveau',
		emptyTopic: 'Rien pour le moment'
	},
	auth: {
		signInWithGoogle: 'Se connecter avec Google',
		signOut: 'Se déconnecter',
		signInFailed: 'La connexion a échoué. Réessaie.',
		loadFailed: 'Impossible de charger ta famille. Vérifie ta connexion.',
		retry: 'Réessayer',
		notLinked: "Cet appareil n'est plus relié à ta famille. Demande un nouveau code à ton parent.",
		parentTitle: 'Je suis un parent',
		childTitle: 'Je suis un enfant',
		linkHelp: 'Demande à ton parent un code de liaison, puis saisis-le ici.',
		linkCode: 'Code de liaison',
		linkSubmit: 'Relier cet appareil',
		linking: 'Liaison…',
		linkCodeFormat: 'Le code fait 6 caractères (lettres et chiffres).',
		linkInvalid: 'Code invalide ou expiré. Demande un nouveau code à ton parent.',
		linkFailed: 'La liaison a échoué. Vérifie ta connexion et réessaie.',
		hello: (name: string) => `Bonjour ${name} !`,
		defaultAdminName: 'Parent',
		defaultFamilyName: (firstName: string) => `Famille de ${firstName}`
	},
	home: {
		parentSection: 'Espace parent',
		importPath: 'Importer un parcours',
		manageProfiles: 'Gérer les profils',
		familyPaths: 'Parcours de la famille',
		noFamilyPaths: 'Aucun parcours importé pour le moment.',
		loadFailed: 'Impossible de charger les parcours.',
		version: (v: number) => `version ${v}`
	},
	map: {
		notFound: "Ce parcours n'existe pas (ou plus).",
		loadFailed: 'Impossible de charger le parcours.',
		todo: 'à faire',
		read: 'lue ✓'
	},
	concept: {
		notFound: "Cette notion n'existe pas (ou plus).",
		loadFailed: 'Impossible de charger la fiche.',
		keyPoints: "L'essentiel",
		examples: 'Exemples',
		showSolution: 'Voir la solution',
		pitfalls: '⚠️ Pièges à éviter',
		practice: "S'entraîner",
		assessment: 'Contrôle',
		backToMap: '← Retour à la carte',
		markRead: "J'ai lu cette fiche",
		isRead: '✓ Fiche lue',
		markUnread: 'Marquer comme non lue'
	},
	profiles: {
		title: 'Profils',
		children: 'Enfants',
		noChildren: "Aucun profil enfant pour l'instant.",
		loadFailed: 'Impossible de charger les profils.',
		addChild: 'Ajouter un enfant',
		firstName: 'Prénom',
		create: 'Créer le profil',
		creating: 'Création…',
		createFailed: "Le profil n'a pas pu être créé.",
		firstNameRequired: 'Indique un prénom.',
		back: '← Profils',
		notFound: "Ce profil n'existe pas (ou plus)."
	},
	dashboard: {
		title: "Où j'en suis",
		loadFailed: 'Impossible de charger ta progression.',
		read: (read: number, total: number) => `${read} / ${plural(total, 'fiche lue', 'fiches lues')}`,
		next: 'Continuer :',
		allRead: 'Toutes les fiches sont lues ✓',
		empty: 'Aucun parcours affecté pour le moment.'
	},
	look: {
		title: 'Pseudo et avatar',
		nickname: 'Pseudo',
		chooseImage: 'Choisir une image',
		removeImage: "Retirer l'image",
		imageFailed: "Cette image n'a pas pu être lue. Essaie une autre image.",
		imageTooLarge: 'Cette image est trop lourde, même réduite. Essaie une autre image.',
		save: 'Enregistrer',
		saved: 'Enregistré.'
	},
	me: {
		title: 'Mon profil',
		open: 'Mon profil'
	},
	devices: {
		title: 'Appareils reliés',
		none: 'Aucun appareil relié.',
		loadFailed: 'Impossible de charger les appareils.',
		linkedOn: (date: string) => `Appareil relié le ${date}`,
		unlink: 'Délier',
		unlinkFailed: "L'appareil n'a pas pu être délié. Vérifie ta connexion.",
		createCode: 'Lier un appareil',
		creatingCode: 'Création du code…',
		codeHelp: (minutes: number) =>
			`Sur le téléphone de l'enfant, ouvre PocketClass, choisis « Je suis un enfant » et saisis ce code. Il est valable ${minutes} minutes et ne sert qu'une fois.`,
		codeFailed: "Le code n'a pas pu être créé. Vérifie ta connexion.",
		offline: 'Nécessite une connexion internet.',
		unlinkThis: 'Délier cet appareil',
		unlinkThisHelp:
			'Pour revenir, il faudra un nouveau code de ton parent. Ta progression et tes remarques sont conservées.',
		unlinkThisConfirm: 'Délier cet appareil ? Il faudra un nouveau code pour revenir.',
		unlinkThisFailed: "L'appareil n'a pas pu être délié. Vérifie ta connexion."
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
		preview: (title: string) => `Aperçu : ${title}`,
		errorsTitle: 'Le JSON contient des erreurs',
		warningsTitle: "Remarques de l'IA",
		version: 'Version',
		versionNew: (v: number) => `${v} (nouveau parcours)`,
		versionUpdate: (from: number, to: number) => `${from} → ${to} (mise à jour)`,
		subject: 'Matière',
		type: 'Type',
		types: { brevet: 'Brevet', test: 'Contrôle', lessons: 'Leçons' },
		conceptLine: (keyPoints: number, practice: number, assessment: number) =>
			[
				plural(keyPoints, 'point-clé', 'points-clés'),
				plural(practice, "exercice d'entraînement", "exercices d'entraînement"),
				plural(assessment, 'exercice de contrôle', 'exercices de contrôle')
			].join(' · '),
		conflict: (conceptId: string, ownerPathId: string) =>
			`La notion « ${conceptId} » appartient déjà au parcours « ${ownerPathId} ». Change son identifiant dans le JSON.`,
		conflictCheckFailed: 'Impossible de vérifier les identifiants des notions.',
		offline: "L'import nécessite une connexion internet.",
		assignTo: 'Affecter à',
		noChildren: "Crée d'abord un profil enfant pour pouvoir affecter le parcours.",
		submit: 'Importer',
		importing: 'Import en cours…',
		failed: "L'import a échoué. Vérifie ta connexion et réessaie.",
		assignFailed:
			"Le parcours est importé, mais l'affectation a échoué. Recharge l'exemple ou le JSON pour réessayer d'affecter.",
		done: (concepts: number, exercises: number) =>
			`Import terminé : ${plural(concepts, 'notion')}, ${plural(exercises, 'exercice')}.`,
		archived: (concepts: number, exercises: number) =>
			`Archivés car absents du nouveau fichier : ${plural(concepts, 'notion')}, ${plural(exercises, 'exercice')}.`,
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
