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
		soon: 'bientôt',
		notFound: "Cette page n'existe pas.",
		error: "Quelque chose s'est mal passé. Recharge la page.",
		home: 'Accueil'
	},
	update: {
		available: 'Une nouvelle version de PocketClass est prête.',
		apply: 'Mettre à jour',
		later: 'Plus tard'
	},
	common: {
		grade: 'Niveau',
		save: 'Enregistrer',
		cancel: 'Annuler',
		needsOnline: 'Nécessite une connexion internet.',
		/** Word to type before an irreversible deletion. */
		confirmWord: 'SUPPRIMER',
		confirmPrompt: (word: string) => `Pour confirmer, tape ${word} :`,
		deleting: 'Suppression…',
		deleteFailed: 'La suppression a échoué. Vérifie ta connexion et réessaie.'
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
		linkCodePlaceholder: 'ABC 234',
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
		manageBinder: 'Gérer les classeurs',
		manageProfiles: 'Gérer les profils',
		childrenNotes: 'Remarques des enfants',
		myBinder: 'Mon classeur',
		familyBinder: 'Classeurs'
	},
	binder: {
		loadFailed: 'Impossible de charger le classeur.',
		noSubjects: 'Aucune matière pour le moment.',
		noSubjectsParent: 'Aucune matière : crée-les dans « Gérer les classeurs ».',
		noChapters: 'Aucun chapitre pour le moment.',
		noSheets: 'Aucune fiche pour le moment.',
		subjectNotFound: "Cette matière n'existe pas (ou plus).",
		chapterNotFound: "Ce chapitre n'existe pas (ou plus).",
		sheets: (count: number) => plural(count, 'fiche'),
		read: (read: number, total: number) => `${read} / ${plural(total, 'fiche lue', 'fiches lues')}`,
		fresh: (count: number) => plural(count, 'nouveauté'),
		state: { new: 'Nouveau', updated: 'Mis à jour', read: 'Lue ✓', opened: 'Commencée' },
		next: 'Continuer',
		allRead: 'Toutes les fiches sont lues !',
		manage: 'Gérer',
		/** Back link label while the subject / chapter name loads. */
		subject: 'Matière',
		chapter: 'Chapitre'
	},
	concept: {
		notFound: "Cette fiche n'existe pas (ou plus).",
		loadFailed: 'Impossible de charger la fiche.',
		keyPoints: "L'essentiel",
		example: (n: number) => `Exemple ${n}`,
		showSolution: 'Voir la solution',
		section: (n: number, total: number) => `Partie ${n} / ${total}`,
		pitfalls: 'Pièges à éviter',
		practice: "S'entraîner",
		assessment: 'Contrôle',
		markRead: "J'ai lu cette fiche",
		isRead: 'Fiche lue, bravo !',
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
		back: 'Profils',
		notFound: "Ce profil n'existe pas (ou plus).",
		deleteTitle: 'Supprimer ce profil',
		deleteHelp: (name: string) =>
			`Supprime définitivement le profil de ${name} : sa progression et ses remarques. Ses appareils reliés sont déliés. Les classeurs ne sont pas touchés. Impossible à annuler.`,
		extraSubjects: 'Matières en plus',
		extraHelp: (grade: string) =>
			`En plus des matières de ${grade}, cet enfant voit les matières cochées :`,
		noOtherSubjects: "Aucune matière d'un autre niveau pour l'instant.",
		delete: 'Supprimer définitivement'
	},
	dashboard: {
		title: "Où j'en suis"
	},
	look: {
		title: 'Pseudo et avatar',
		nickname: 'Pseudo',
		chooseImage: 'Choisir une image',
		removeImage: "Retirer l'image",
		imageFailed: "Cette image n'a pas pu être lue. Essaie une autre image.",
		imageTooLarge: 'Cette image est trop lourde, même réduite. Essaie une autre image.',
		saved: 'Enregistré.'
	},
	me: {
		title: 'Mon profil'
	},
	notes: {
		title: 'Mes remarques',
		parentTitle: 'Remarques',
		familyTitle: 'Remarques des enfants',
		showResolved: 'Afficher aussi les remarques réglées',
		noChildren: "Aucun profil enfant pour l'instant.",
		link: (open: number) => (open === 0 ? 'Mes remarques' : `Mes remarques · ${open} à voir`),
		formTitle: 'Une difficulté ?',
		formHelp:
			"Note ce que tu as trouvé difficile : tu le retrouveras dans « Mes remarques », et ton parent pourra t'aider.",
		placeholder: "Ex. : je ne comprends pas pourquoi on change le signe de l'exposant.",
		add: 'Enregistrer la remarque',
		added: 'Remarque enregistrée.',
		empty: 'Aucune remarque.',
		loadFailed: 'Impossible de charger les remarques.',
		edit: 'Modifier',
		delete: 'Supprimer',
		deleteConfirm: 'Supprimer cette remarque ?',
		status: { open: 'À voir', seen: 'Vue par le parent', resolved: 'Réglée ✓' },
		/** Parent buttons, by target status. */
		review: { open: 'Rouvrir', seen: 'Vue', resolved: 'Réglée' },
		archivedConcept: 'Fiche archivée',
		on: (date: string) => `le ${date}`
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
		unlinkThis: 'Délier cet appareil',
		unlinkThisHelp:
			'Pour revenir, il faudra un nouveau code de ton parent. Ta progression et tes remarques sont conservées.',
		unlinkThisConfirm: 'Délier cet appareil ? Il faudra un nouveau code pour revenir.'
	},
	parent: {
		adminOnly: 'Cette page est réservée aux parents.'
	},
	manage: {
		title: 'Gérer les classeurs',
		help: "Une matière par niveau (ex. Maths 3e). Chaque enfant voit les matières de son niveau ; tu peux lui en ajouter d'autres depuis son profil.",
		back: 'Gérer les classeurs',
		view: "Voir comme l'enfant",
		newSubject: 'Nouvelle matière',
		subjectName: 'Nom',
		subjectPlaceholder: 'Ex. : Mathématiques',
		color: 'Couleur',
		colors: {
			amber: 'Moutarde',
			blue: 'Bleu',
			emerald: 'Vert',
			rose: 'Rose',
			violet: 'Violet',
			cyan: 'Turquoise',
			orange: 'Orange',
			lime: 'Citron vert'
		},
		icon: 'Icône',
		iconHidden: "L'image choisie remplace l'icône.",
		icons: {
			calculator: 'Calculatrice',
			pi: 'Pi',
			book: 'Livre',
			languages: 'Langues',
			landmark: 'Monument',
			globe: 'Globe',
			flask: 'Fiole',
			atom: 'Atome',
			leaf: 'Feuille',
			laptop: 'Ordinateur',
			music: 'Musique',
			palette: 'Palette',
			dumbbell: 'Haltère',
			star: 'Étoile'
		},
		image: 'Image ou logo (facultatif)',
		imageHelp: "Recadrée en carré au centre. Elle remplace l'icône.",
		create: 'Créer',
		nameRequired: 'Indique un nom.',
		subjectSettings: 'Réglages de la matière',
		chapterSettings: 'Réglages du chapitre',
		saved: 'Enregistré.',
		chapters: 'Chapitres',
		newChapter: 'Nouveau chapitre',
		chapterTitle: 'Titre',
		chapterPlaceholder: 'Ex. : Calcul numérique',
		group: 'Partie (facultatif)',
		groupHelp: 'Ex. : Algèbre, Géométrie. Les chapitres d’une même partie sont regroupés.',
		titleRequired: 'Indique un titre.',
		sheets: 'Fiches',
		moveUp: 'Monter',
		moveDown: 'Descendre',
		hide: 'Masquer',
		show: 'Réafficher',
		hidden: 'Masqué aux enfants',
		noSubjects: 'Aucune matière. Crée la première ci-dessous.',
		/** Subjects without a known grade (left by the old path import). */
		otherSubjects: 'Sans niveau (ancien import)',
		delete: 'Supprimer',
		deleteSubjectTitle: 'Supprimer la matière',
		deleteSubjectHelp: (chapters: number, sheets: number) =>
			`Supprime définitivement la matière, ${plural(chapters, 'chapitre')} et ${plural(sheets, 'fiche')}, avec la progression et les remarques des enfants sur ces fiches. Pour la retirer sans rien perdre, masque-la plutôt.`,
		deleteChapterTitle: 'Supprimer le chapitre',
		deleteChapterHelp: (sheets: number) =>
			`Supprime définitivement le chapitre et ${plural(sheets, 'fiche')}, avec la progression et les remarques des enfants sur ces fiches. Pour le retirer sans rien perdre, masque-le plutôt.`,
		deleteNamed: (title: string) => `Supprimer « ${title} »`,
		deleteSheetHelp:
			'Supprime définitivement la fiche, ses exercices, la progression et les remarques des enfants. Pour la retirer sans rien perdre, masque-la plutôt.'
	},
	import: {
		addSheet: 'Ajouter une fiche',
		addSheetHelp:
			"Décris la fiche voulue, copie le prompt dans l'IA de ton choix, puis colle sa réponse ici. Pour modifier une fiche, colle une nouvelle version avec le même identifiant.",
		importChapter: 'Importer un chapitre complet',
		importChapterHelp:
			"Pour démarrer une matière : l'IA produit un chapitre et toutes ses fiches d'un coup.",
		request: 'Sujet de la fiche',
		requestPlaceholder: 'Ex. : les puissances de 10',
		chapterRequest: 'Notions du chapitre',
		chapterRequestPlaceholder: 'Ex. : fractions, puissances, racines carrées',
		prompt: "Prompt pour l'IA",
		copy: 'Copier le prompt',
		copied: 'Copié ✓',
		copyFailed: 'Copie impossible : sélectionne le texte à la main.',
		paste: "Réponse de l'IA (JSON)",
		sheetPlaceholder: '{ "format": "pocketclass/sheet@1", … }',
		chapterPlaceholder: '{ "format": "pocketclass/chapter@1", … }',
		loadSample: "Charger l'exemple",
		sampleFailed: "Impossible de charger l'exemple.",
		errorsTitle: 'Le JSON contient des erreurs',
		warningsTitle: "Remarques de l'IA",
		sheetLine: (keyPoints: number, practice: number, assessment: number) =>
			[
				plural(keyPoints, 'point-clé', 'points-clés'),
				plural(practice, "exercice d'entraînement", "exercices d'entraînement"),
				plural(assessment, 'exercice de contrôle', 'exercices de contrôle')
			].join(' · '),
		isNew: 'Nouvelle fiche',
		isUpdate: (version: number) => `Mise à jour (version ${version} → ${version + 1})`,
		conflict: (sheetId: string) =>
			`La fiche « ${sheetId} » est déjà dans un autre chapitre. Change son identifiant dans le JSON, ou masque l'autre fiche.`,
		checkFailed: 'Impossible de vérifier les fiches existantes.',
		offline: "L'import nécessite une connexion internet.",
		submitSheet: 'Enregistrer',
		submitChapter: 'Créer le chapitre',
		importing: 'Import en cours…',
		failed: "L'import a échoué. Vérifie ta connexion et réessaie.",
		done: (created: number, updated: number) =>
			`Import terminé : ${plural(created, 'fiche ajoutée', 'fiches ajoutées')}, ${plural(updated, 'fiche mise à jour', 'fiches mises à jour')}.`,
		archived: (exercises: number) =>
			`Archivés car absents du nouveau JSON : ${plural(exercises, 'exercice')}.`,
		openChapter: 'Voir le chapitre'
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
