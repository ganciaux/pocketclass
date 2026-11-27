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

/** « 14:05 »: the time of the day (activity history). */
export const formatTime = (date: Date) =>
	date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** « 25 nov., 14:05 »: a short date with the time (lists of attempts). */
export const formatDateTime = (date: Date) =>
	date.toLocaleString('fr-FR', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});

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
		/** The handle of a row that can be dragged (`<DragHandle>`). */
		drag: 'Glisser pour déplacer',
		/** `<ScrollTop>`: how much of the page was read. */
		toTop: (percent: number) => `Revenir en haut (page lue à ${percent} %)`,
		grade: 'Niveau',
		save: 'Enregistrer',
		cancel: 'Annuler',
		needsOnline: 'Nécessite une connexion internet.',
		/** Word to type before an irreversible deletion. */
		confirmWord: 'SUPPRIMER',
		confirmPrompt: (word: string) => `Pour confirmer, tape ${word} :`,
		deleting: 'Suppression…',
		deleteFailed: 'La suppression a échoué. Vérifie ta connexion et réessaie.',
		delete: 'Supprimer',
		close: 'Fermer'
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
		manageBinder: 'Classeurs',
		manageProfiles: 'Profils',
		childrenNotes: 'Remarques',
		stats: 'Statistiques',
		myBinder: 'Mon classeur',
		familyBinder: 'Classeurs',
		seenTitle: 'Mes fiches vues',
		seenHint: 'Retrouve les fiches que tu as ouvertes.',
		notesTitle: 'Mes remarques',
		notesHint: 'Ce que tu as trouvé difficile.',
		notesOpen: (n: number) => `${n} à voir`,
		notesSeen: (n: number) => `${n} à régler`
	},
	binder: {
		loadFailed: 'Impossible de charger le classeur.',
		noSubjects: 'Aucune matière pour le moment.',
		noSubjectsParent: 'Aucune matière : crée-les dans Espace parent → « Classeurs ».',
		noChapters: 'Aucun chapitre pour le moment.',
		noSheets: 'Aucune fiche pour le moment.',
		subjectNotFound: "Cette matière n'existe pas (ou plus).",
		chapterNotFound: "Ce chapitre n'existe pas (ou plus).",
		sheets: (count: number) => plural(count, 'fiche'),
		chapterCount: (count: number) => plural(count, 'chapitre'),
		subjectCount: (count: number) => plural(count, 'matière'),
		read: (read: number, total: number) => `${read} / ${plural(total, 'fiche lue', 'fiches lues')}`,
		fresh: (count: number) => plural(count, 'nouveauté'),
		acquired: (count: number) => plural(count, 'acquise'),
		state: { new: 'Nouveau', updated: 'Mis à jour', read: 'Lue ✓', opened: 'En cours' },
		/** Chapter page: toggles to filter the sheets by status (several may be on). */
		filter: {
			label: 'Filtrer les fiches',
			all: 'Toutes',
			status: {
				new: 'Nouvelles',
				opened: 'En cours',
				read: 'Lues',
				acquired: 'Acquises',
				failed: 'Ratées'
			},
			empty: 'Aucune fiche pour ce filtre.'
		},
		next: 'Continuer',
		allRead: 'Toutes les fiches sont lues !',
		manage: 'Gérer',
		/** Back link label while the subject / chapter name loads. */
		subject: 'Matière',
		chapter: 'Chapitre'
	},
	concept: {
		position: (n: number, total: number) => `Fiche ${n} sur ${total} du chapitre`,
		nextSheet: 'Fiche suivante',
		/** « Détails | Résumé » switch above the sections (when the sheet has summaries). */
		viewLabel: 'Affichage de la fiche',
		sectionViewLabel: (n: number) => `Affichage de la partie ${n}`,
		/** Pictures of a section (`PictureStrip`), added by the parent. */
		addSectionImage: 'Ajouter une image',
		sectionImageAlt: (section: number, n: number) => `Image ${n} de la partie ${section}`,
		viewDetails: 'Détails',
		viewSummary: 'Résumé',
		notFound: "Cette fiche n'existe pas (ou plus).",
		loadFailed: 'Impossible de charger la fiche.',
		keyPoints: "L'essentiel",
		tags: 'Mots-clés',
		searchTag: (tag: string) => `Chercher « ${tag} » dans mes fiches vues`,
		example: (n: number) => `Exemple ${n}`,
		showSolution: 'Voir la solution',
		section: (n: number, total: number) => `Partie ${n} / ${total}`,
		goToSection: (section: number) => `(aller à la partie ${section})`,
		pitfalls: 'Pièges à éviter',
		practice: "S'entraîner",
		assessment: 'Contrôle',
		markRead: "J'ai lu cette fiche",
		isRead: 'Fiche lue, bravo !',
		markUnread: 'Marquer comme non lue'
	},
	practice: {
		title: "S'entraîner",
		sheet: 'La fiche',
		loadFailed: "Impossible de charger l'entraînement.",
		empty: "Cette fiche n'a pas encore d'exercice d'entraînement.",
		progress: (n: number, total: number) => `Question ${n} / ${total}`,
		retryRound: 'Mes erreurs',
		check: 'Valider',
		next: 'Suivant',
		seeResult: 'Voir mon score',
		true: 'Vrai',
		false: 'Faux',
		answerPlaceholder: 'Ta réponse',
		blank: (n: number) => `Trou ${n}`,
		moveUp: 'Monter',
		moveDown: 'Descendre',
		orderHelp:
			'Remets dans le bon ordre : fais glisser une ligne par sa poignée, ou utilise les flèches.',
		matchHelp: 'Touche un élément à gauche, puis celui qui va avec à droite.',
		matchLinked: (n: number) => `relié au ${n}`,
		categorizeHelp: 'Choisis la bonne catégorie pour chaque élément.',
		showAnswer: 'Voir la réponse',
		paperHelp: 'Fais-le sur papier, puis regarde la correction.',
		showCorrection: 'Voir la correction',
		noCorrection: 'Pas de correction fournie : vérifie avec ta fiche ou demande à un parent.',
		knew: 'Je savais',
		didNotKnow: 'Je ne savais pas',
		succeeded: "J'ai réussi",
		failed: "Je n'ai pas réussi",
		correct: 'Bonne réponse !',
		wrong: 'Pas tout à fait.',
		expected: 'La bonne réponse',
		why: 'Pourquoi',
		score: (correct: number, total: number) => `${correct} / ${total}`,
		cheer: (rate: number) =>
			rate === 1
				? 'Parfait, tout juste !'
				: rate >= 0.7
					? 'Très bien, continue comme ça !'
					: rate >= 0.4
						? "C'est en bonne voie. Refais tes erreurs pour progresser."
						: 'Relis la fiche, puis réessaie : ça va venir.',
		retryWrong: (n: number) => `Refaire mes erreurs (${n})`,
		newSeries: 'Nouvelle série',
		backToSheet: 'Retour à la fiche',
		notSaved: "Mode parent : ce score n'est pas enregistré.",
		best: (score: string) => `Meilleur : ${score}`,
		last: (score: string) => `Dernier : ${score}`,
		parentTitle: 'Entraînement',
		noScores: "Aucune série d'entraînement pour l'instant.",
		bestLabel: 'meilleur',
		challengeRecord: (n: number) => `Défi : ${n}`
	},
	challenge: {
		title: 'Défi 60 s',
		help: (seconds: number) =>
			`Réponds juste au plus grand nombre de questions en ${seconds} secondes. Une erreur ne fait pas perdre de point.`,
		tooFew: (min: number) =>
			`Il faut au moins ${min} questions rapides (QCM, vrai/faux, calcul) ou un exercice généré sur cette fiche pour le défi.`,
		record: (n: number) => `Ton record : ${plural(n, 'bonne réponse', 'bonnes réponses')}`,
		noRecord: 'Pas encore de record : à toi de jouer !',
		start: "C'est parti !",
		timeLeft: (s: number) => `${s} s`,
		right: (n: number) => `${n} juste${n > 1 ? 's' : ''}`,
		done: 'Temps écoulé !',
		result: (correct: number, total: number) =>
			`${plural(correct, 'bonne réponse', 'bonnes réponses')} sur ${total}`,
		newRecord: 'Nouveau record !',
		again: 'Rejouer'
	},
	assessment: {
		title: 'Contrôle',
		loadFailed: 'Impossible de charger le contrôle.',
		empty: "Cette fiche n'a pas encore de question de contrôle.",
		help: (questions: number, passRate: number) =>
			`${plural(questions, 'question')}, sans correction pendant le contrôle. Réussi à partir de ${passRate} % de bonnes réponses.`,
		reward: (points: number) => `À la clé : le tampon « Acquise » et ${plural(points, 'point')}.`,
		acquired: 'Fiche acquise ! Tu peux le refaire pour battre ton meilleur score.',
		best: (correct: number, total: number) => `Meilleur score : ${correct} / ${total}`,
		locked: "Raté la dernière fois : refais d'abord une série d'entraînement pour retenter.",
		toPractice: "S'entraîner",
		start: 'Commencer le contrôle',
		progress: (n: number, total: number) => `Question ${n} / ${total}`,
		passed: 'Contrôle réussi !',
		failed: 'Pas encore…',
		score: (correct: number, total: number) => `${correct} / ${total}`,
		needed: (passRate: number) => `Il fallait ${passRate} % de bonnes réponses.`,
		earned: (points: number) => `+ ${plural(points, 'point')}`,
		afterFail: "Refais une série d'entraînement pour débloquer un nouvel essai.",
		correction: 'Correction',
		question: (n: number) => `Question ${n}`,
		right: 'Juste',
		wrong: 'Faux',
		expected: 'Bonne réponse :',
		backToSheet: 'Retour à la fiche',
		/** Sheet button. */
		sheetBest: (correct: number, total: number) => `Meilleur : ${correct} / ${total}`,
		sheetLocked: "Après une série d'entraînement",
		/** The « Raté » stamp. */
		failedStamp: 'Raté',
		failedStampHint: 'on retente !',
		/** Parent card on a sheet. */
		settingsTitle: 'Contrôle',
		settingsHelp: (passRate: number, points: number) =>
			`Par défaut : réussi à ${passRate} %, ${plural(points, 'point')} à la première réussite.`,
		passRate: 'Seuil de réussite (%)',
		points: 'Points gagnés',
		save: 'Enregistrer',
		reset: 'Valeurs par défaut',
		saved: 'Réglages enregistrés.'
	},
	export: {
		sheet: 'Exporter la fiche (JSON)',
		chapter: 'Exporter le chapitre (JSON)',
		subject: 'Exporter la matière (JSON)',
		binder: 'Exporter tous les classeurs (JSON)',
		failed: "L'export a échoué. Vérifie ta connexion et réessaie.",
		restoreTitle: 'Restaurer une sauvegarde',
		restoreHelp:
			"Un fichier « matière », « classeurs » ou « sauvegarde complète » exporté par PocketClass : ses matières sont ajoutées comme nouvelles matières. Une fiche déjà présente (même identifiant) bloque l'import : supprime-la ou masque-la d'abord.",
		/** Full backup, in the parent's « Mon profil ». */
		familyTitle: 'Sauvegarde complète',
		familyHelp:
			"Tout dans un fichier : les classeurs (fiches, exercices, images) et, pour chaque profil, la progression, les remarques, les essais et les points. À garder en lieu sûr, au cas où les données en ligne seraient perdues. La restauration (Classeurs) remet les classeurs ; le reste sert d'archive.",
		familyButton: 'Télécharger la sauvegarde complète',
		familyArchive: (profiles: number) =>
			`Sauvegarde complète : seuls les classeurs sont restaurés. Les données de ${plural(profiles, 'profil')} (progression, remarques, points) restent dans le fichier, comme archive.`,
		pasteLabel: 'Ou colle le contenu du fichier (JSON)',
		placeholder: '{ "format": "pocketclass/binder@1", … }',
		summary: (subjects: number, chapters: number, sheets: number) =>
			`${plural(subjects, 'matière')}, ${plural(chapters, 'chapitre')}, ${plural(sheets, 'fiche')}`,
		submit: 'Restaurer',
		done: (subjects: number) => `${plural(subjects, 'matière ajoutée', 'matières ajoutées')}.`
	},
	points: {
		count: (n: number) => plural(n, 'point')
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
	/** Co-parents: several parents administer the family (`<ParentsCard>`, `<InviteBanner>`). */
	parents: {
		title: 'Parents',
		help: 'Les parents ont les mêmes droits : classeurs, enfants, remarques, statistiques.',
		you: 'toi',
		creator: 'a créé la famille',
		missingProfile: 'Parent sans profil',
		remove: 'Retirer',
		leave: 'Quitter la famille',
		removeTitle: (name: string) => `Retirer ${name} des parents ?`,
		removeMessage:
			'Son profil parent et ses données de test sont supprimés. À sa prochaine connexion, ce parent retrouve sa propre famille. Les classeurs et les enfants ne sont pas touchés.',
		leaveTitle: 'Quitter cette famille ?',
		leaveMessage:
			"Ton profil parent et tes données de test ici sont supprimés, et tu retrouves ta propre famille. L'autre parent peut t'inviter à nouveau.",
		invite: 'Inviter un parent',
		inviteHelp:
			"Son adresse Google : quand ce parent se connecte avec ce compte, son accueil lui propose de rejoindre cette famille. Préviens cette personne toi-même, l'app n'envoie pas d'e-mail.",
		email: 'E-mail',
		send: 'Inviter',
		sending: 'Invitation…',
		invalidEmail: 'Cette adresse e-mail ne semble pas valide.',
		alreadyParent: 'Cette personne est déjà parent de la famille.',
		inviteFailed:
			"L'invitation n'a pas pu être enregistrée (connexion, ou adresse déjà invitée par une autre famille).",
		pending: 'Invitations en attente',
		cancel: "Annuler l'invitation",
		actionFailed: "L'action n'a pas abouti. Vérifie ta connexion et réessaie.",
		offline: 'Hors connexion : les parents se gèrent en ligne.',
		loadFailed: 'Impossible de charger les parents.',
		banner: (name: string) => `${name} t'invite à rejoindre sa famille comme parent.`,
		join: 'Rejoindre',
		decline: 'Refuser',
		joinTitle: (name: string) => `Rejoindre la famille de ${name} ?`,
		joinMessage:
			"Tu verras ses classeurs et ses enfants. Ta famille actuelle reste enregistrée mais ne s'affiche plus : exporte-la d'abord (« Mon profil » → « Sauvegarde complète ») si tu veux en garder une copie."
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
	/** A background write refused by the server (`<WriteErrorToast>`). */
	writes: {
		runLost: "Ton résultat n'a pas été enregistré.",
		changeLost: "Une modification n'a pas été enregistrée.",
		refusedHint:
			"Vérifie que l'heure du téléphone est automatique, recharge l'app, puis recommence.",
		retryHint: "Vérifie ta connexion, recharge l'app, puis recommence.",
		ok: 'OK'
	},
	/** Day / night in « Mon profil ». */
	theme: {
		title: 'Affichage',
		choice: { auto: 'Auto', light: 'Clair', dark: 'Sombre' },
		help: 'Auto suit le réglage du téléphone. Le choix est retenu sur cet appareil.'
	},
	/** The child's « Aujourd'hui » card on the home page. */
	today: {
		title: "Aujourd'hui",
		streak: (days: number) => `${plural(days, "jour d'affilée", "jours d'affilée")}`,
		startStreak: "Commence ta série aujourd'hui !",
		keepStreak: "Une activité aujourd'hui pour la continuer.",
		mistakes: (n: number) => `Revoir ${plural(n, 'erreur')}`,
		revision: (title: string, points: number) => `Réviser « ${title} » (+${points})`,
		read: (title: string) => `Lire « ${title} »`,
		allDone: "Tout est à jour : choisis une fiche dans ton classeur pour t'entraîner."
	},
	/** « Mes erreurs à revoir »: wrong answers come back after a while. */
	mistakes: {
		title: 'Mes erreurs à revoir',
		hint: "Les questions ratées reviennent, jusqu'à ce que tu les saches.",
		dueCount: (n: number) => `${n} à revoir`,
		due: (n: number) => `${plural(n, 'question')} à revoir aujourd'hui.`,
		start: (n: number) => `Revoir ${plural(n, 'question')}`,
		again: (n: number) => `Encore ${plural(n, 'question')}`,
		howItWorks:
			'Une question ratée revient le lendemain, puis 3 jours plus tard ; réussie deux fois de suite, elle disparaît.',
		nothingToday: (left: string) => `Rien à revoir aujourd'hui. Prochaine question dans ${left}.`,
		none: 'Aucune erreur à revoir. Bravo !',
		loadFailed: 'Impossible de charger tes erreurs.'
	},
	/** Activity history: finished runs with the points they earned, by day. */
	activity: {
		title: 'Mon activité',
		parentTitle: 'Activité',
		hint: 'Ce que tu as fait, jour par jour, et tes points.',
		today: "Aujourd'hui",
		yesterday: 'Hier',
		day: (date: Date) =>
			date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
		kind: {
			series: 'Entraînement',
			timed: 'Défi',
			assessment: 'Contrôle',
			review: 'Erreurs revues',
			points: 'Points'
		},
		passed: 'Réussi',
		failed: 'Raté',
		points: (n: number) => `+${n}`,
		dayPoints: (n: number) => `+${plural(n, 'point')}`,
		challengeScore: (n: number) => plural(n, 'bonne réponse', 'bonnes réponses'),
		deletedSheet: 'Fiche supprimée',
		more: 'Voir plus',
		empty: 'Rien pour le moment : fais une série, un défi ou un contrôle !',
		emptyWindow: 'Rien ces derniers jours.',
		loadFailed: "Impossible de charger l'activité."
	},
	/** Revision points: a series at 70 % on an acquired sheet, once a week (the hourglass). */
	revision: {
		title: 'Mes révisions',
		hint: 'Revois tes fiches acquises pour gagner des points.',
		readyCount: (n: number) => plural(n, 'prête', 'prêtes'),
		ready: (points: number, rate: number) =>
			`Révision prête : une série à ${rate} % rapporte ${plural(points, 'point')}.`,
		waiting: (left: string) => `Prochaine révision qui rapporte des points dans ${left}.`,
		left: ({ days, hours, minutes }: { days: number; hours: number; minutes: number }) =>
			days > 0
				? `${days} j ${hours} h`
				: hours > 0
					? `${hours} h ${minutes} min`
					: `${minutes} min`,
		earned: (points: number) => `+${plural(points, 'point')} de révision !`,
		readyHeading: 'À réviser maintenant',
		waitingHeading: 'Sablier en cours',
		practise: 'Réviser',
		empty:
			"Aucune fiche acquise pour le moment : réussis le contrôle d'une fiche, puis reviens la réviser chaque semaine.",
		loadFailed: 'Impossible de charger tes révisions.'
	},
	seen: {
		title: 'Mes fiches vues',
		search: 'Rechercher une fiche',
		all: 'Toutes',
		random: 'Au hasard',
		empty: "Tu n'as encore ouvert aucune fiche.",
		noMatch: 'Aucune fiche ne correspond.',
		loadFailed: 'Impossible de charger tes fiches.'
	},
	mindMap: {
		title: 'Carte mentale',
		/** Pictures added by the parent under the drawn map. */
		imagesTitle: 'Images de la carte',
		imageAlt: (n: number) =>
			n > 0 ? `Image ${n} de la carte mentale` : 'Image de la carte mentale',
		addImage: 'Ajouter une image',
		imagesHelp: (max: number) =>
			`Jusqu'à ${max} images (photo d'une carte dessinée à la main…), réduites automatiquement.`,
		deleteImage: 'Supprimer cette image ?',
		/** Button on the sheet page. */
		open: 'Carte mentale',
		testBranch: 'Me tester',
		testAll: 'Me tester sur toute la carte',
		/** Label of a test, above the questions. */
		testing: (what: string) => `Me tester : ${what}`,
		wholeMap: 'toute la carte',
		noQuestions: "Pas encore d'exercices pour se tester sur cette fiche.",
		again: 'Encore',
		back: 'Retour à la carte',
		loadFailed: 'Impossible de charger les exercices.'
	},
	stamp: {
		label: 'Acquise',
		/** Parent card on a sheet. */
		title: 'Notion acquise',
		help: "Tamponne la fiche quand tu as vérifié avec l'enfant qu'il a compris.",
		noChildren:
			"Aucun enfant n'a cette fiche dans son classeur (son niveau ou une matière ajoutée).",
		toggle: (name: string, acquired: boolean) =>
			acquired ? `${name} : acquise, retirer le tampon` : `${name} : tamponner « Acquise »`,
		/** Test mode: the parent stamps their own test profile. */
		testSet: 'Tamponner (test)',
		testClear: 'Retirer le tampon (test)'
	},
	cards: {
		title: 'Cartes de révision',
		open: 'Cartes',
		openDeck: 'Réviser en cartes',
		loadFailed: "Les cartes n'ont pas pu être chargées.",
		empty: "Pas encore de cartes ici : il faut d'abord des fiches.",
		tags: {
			definition: 'Définition',
			rule: 'Règle',
			method: 'Méthode',
			true_false: 'Vrai ou faux',
			pitfall: 'Piège'
		},
		position: (n: number, total: number) => `Carte ${n} sur ${total}`,
		front: 'Recto',
		back: 'Verso',
		flipHint: 'Touche la carte pour la retourner',
		example: 'Exemple',
		flip: 'Retourner',
		previous: 'Précédente',
		next: 'Suivante',
		known: 'Je sais',
		review: 'À revoir',
		countKnown: (n: number) => `Je sais : ${n}`,
		countReview: (n: number) => `À revoir : ${n}`,
		countUnsorted: (n: number) => `Pas classées : ${n}`,
		shuffle: 'Mélanger',
		onlyReview: 'Seulement les cartes à revoir',
		noReview: 'Aucune carte à revoir pour le moment.',
		done: 'Paquet terminé !',
		restart: 'Recommencer',
		reviewAgain: (n: number) => `Revoir les cartes à revoir (${n})`,
		notSaved: 'Ton classement est gardé seulement pendant cette visite.',
		readSection: (title: string) => `Relis la partie « ${title} ».`,
		pitfallBack: 'Un piège fréquent : vérifie que tu ne le fais pas.'
	},
	stats: {
		title: 'Statistiques',
		who: 'Enfant',
		myTests: 'Mes tests',
		noChildren: "Ajoute d'abord un enfant dans Espace parent → « Profils ».",
		loadFailed: "Les statistiques n'ont pas pu être chargées.",
		overview: 'Vue globale',
		points: 'Points',
		read: 'Fiches lues',
		acquired: 'Acquises',
		finished: 'Essais terminés',
		lastActivity: 'Dernière activité',
		never: 'Pas encore',
		noSubjects: "Aucun classeur pour l'instant.",
		openings: 'Ouvertures',
		opens: (n: number) => plural(n, 'ouverture'),
		series: 'Séries',
		challenges: 'Défis',
		assessments: 'Contrôles',
		/** « 3 terminés sur 5 » (started unknown for runs older than the counter: « 3 terminés »). */
		runs: (finished: number, started: number | null) =>
			!finished && !started
				? 'aucun'
				: started === null
					? plural(finished, 'terminé')
					: `${plural(finished, 'terminé')} sur ${started}`,
		average: (n: number) => `moyenne ${n} %`,
		record: (n: number) => `record ${n}`,
		acquiredBadge: 'Acquise',
		failedBadge: 'Raté',
		failed: (n: number) => plural(n, 'ratée'),
		/** Under a binder's name: « 2 / 6 fiches lues · 5 ouvertures · dernière activité : 25 novembre ». */
		binderLine: (read: string, opens: string, when: string) =>
			`${read} · ${opens} · dernière activité : ${when}`,
		hiddenSheet: 'Fiche masquée ou supprimée',
		lastScore: (score: string) => `dernier ${score}`,
		best: (n: number) => `meilleur ${n} %`,
		recent: 'Derniers essais',
		noAttempts: "Aucun essai terminé pour l'instant.",
		when: 'Quand',
		sheet: 'Fiche',
		kind: 'Type',
		score: 'Score',
		pending: "à l'instant",
		countedSince:
			'Ouvertures et essais « lancés » : comptés depuis la mise à jour de fin novembre 2026.'
	},
	testMode: {
		start: (name: string) => `Tester comme ${name}`,
		startHelp: 'Tu vois son classeur, mais ta progression et tes remarques restent à toi.',
		banner: (name: string) => `Mode test : classeur de ${name}`,
		reset: 'Remettre à zéro',
		resetConfirm: 'Effacer ta progression et tes remarques de test ?',
		resetFailed: "La remise à zéro n'a pas fonctionné.",
		stop: 'Quitter'
	},
	me: {
		title: 'Mon profil'
	},
	account: {
		title: 'Mot de passe',
		help: 'Pour te connecter sans Google (pratique sur iPhone).',
		email: 'E-mail',
		password: 'Mot de passe',
		confirm: 'Confirmer le mot de passe',
		set: 'Définir le mot de passe',
		change: 'Changer le mot de passe',
		saving: 'Enregistrement…',
		saved: 'Mot de passe enregistré.',
		tooShort: (min: number) => `Au moins ${min} caractères.`,
		mismatch: 'Les deux mots de passe sont différents.',
		or: 'ou',
		signIn: 'Se connecter',
		signingIn: 'Connexion…',
		forgot: 'Mot de passe oublié ?',
		resetSent:
			"Si un compte existe pour cet e-mail, un message pour choisir un nouveau mot de passe vient d'être envoyé.",
		errors: {
			wrongCredentials: 'E-mail ou mot de passe incorrect.',
			tooManyRequests: "Trop d'essais. Réessaie dans quelques minutes.",
			offline: 'Pas de connexion internet.',
			weakPassword: 'Mot de passe trop faible.',
			alreadyUsed: 'Cet e-mail est déjà utilisé par un autre compte.',
			invalidEmail: 'E-mail invalide.',
			popupClosed: 'Fenêtre Google fermée : réessaie.',
			generic: "Ça n'a pas fonctionné. Réessaie."
		}
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
		/** Where a note was written (« Mes remarques », parent view). */
		place: {
			chapter: 'Chapitre ·',
			subject: 'Matière ·',
			free: 'Remarque libre',
			gone: {
				sheet: 'Fiche supprimée ou masquée',
				chapter: 'Chapitre supprimé ou masqué',
				subject: 'Matière supprimée ou masquée'
			}
		},
		/** Floating button on the child pages: its label is `formTitle`. */
		about: {
			chapter: (title: string) => `À propos du chapitre « ${title} ».`,
			subject: (name: string) => `À propos de la matière « ${name} ».`,
			free: 'Remarque libre : elle ne se rapporte à aucune fiche.'
		},
		close: 'Fermer',
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
		unlinkThisConfirm: 'Délier cet appareil ?',
		unlinkThisConfirmHelp: 'Il faudra un nouveau code pour revenir.'
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
			"Décris la fiche voulue, copie le prompt dans l'IA de ton choix, puis colle sa réponse ici. Pour modifier une fiche, colle une nouvelle version avec le même identifiant. Un chapitre exporté (puis retouché) peut aussi être collé ici : ses fiches sont mises à jour dans ce chapitre.",
		importChapter: 'Importer un cours',
		importChapterHelp:
			"Décris le cours, ou joins ses photos à l'IA avec le prompt : elle le découpe en chapitres (un par grand thème) avec leurs fiches. Pour mettre à jour un chapitre existant, colle son JSON dans la page de ce chapitre.",
		request: 'Sujet de la fiche',
		requestPlaceholder: 'Ex. : les puissances de 10',
		chapterRequest: 'Contenu du cours',
		chapterRequestPlaceholder: 'Ex. : thèmes 1 à 3 du cahier (photos jointes à l’IA)',
		prompt: "Prompt pour l'IA",
		copy: 'Copier le prompt',
		copied: 'Copié ✓',
		copyFailed: 'Copie impossible : sélectionne le texte à la main.',
		paste: "Réponse de l'IA (JSON)",
		sheetPlaceholder: '{ "format": "pocketclass/sheet@1", … }',
		chapterPlaceholder: '{ "format": "pocketclass/chapters@1", … }',
		/** A course split into chapters, before saving. */
		courseChapter: (sheets: number) => plural(sheets, 'fiche'),
		thinChapters: (titles: string[]) =>
			`${titles.length > 1 ? 'Ces chapitres n’ont' : 'Ce chapitre n’a'} qu’une fiche : ${titles.map((t) => `« ${t} »`).join(', ')}. Tu peux importer quand même, ou demander à l’IA de ${titles.length > 1 ? 'les' : 'le'} regrouper avec un thème voisin.`,
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
		chooseFile: 'Choisir un fichier',
		fileFailed: 'Impossible de lire ce fichier.',
		isNew: 'Nouvelle fiche',
		/** Opens the sheet as the child will read it, before saving. */
		preview: 'Aperçu',
		isUpdate: (version: number) => `Mise à jour (version ${version} → ${version + 1})`,
		conflict: (sheetId: string, chapter: string | undefined) =>
			`La fiche « ${sheetId} » est déjà dans ${chapter ? `le chapitre « ${chapter} »` : 'un autre chapitre'}. Pour la mettre à jour, colle ce JSON dans ce chapitre ; sinon change son identifiant ou masque l'autre fiche.`,
		openConflictChapter: 'Ouvrir ce chapitre',
		checkFailed: 'Impossible de vérifier les fiches existantes.',
		offline: "L'import nécessite une connexion internet.",
		submitSheet: 'Enregistrer',
		/** Chapter page: a `chapter@1` file updates (or adds) its sheets in this chapter. */
		submitSheets: 'Enregistrer les fiches',
		submitChapter: (chapters: number) =>
			chapters > 1 ? `Créer les ${chapters} chapitres` : 'Créer le chapitre',
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
		figurePoints: 'une figure a de 2 à 12 points',
		figureNames: (value: string, count: number) =>
			`« ${value} » doit nommer ${count} points différents de la figure (ex. ${count === 2 ? '« AB »' : '« BAC »'})`,
		notRightAngle: (angle: string) =>
			`l'angle « ${angle} » n'est pas droit avec ces coordonnées : corrige les points`,
		clozeEmptyBlank: 'un trou [[ ]] est vide',
		imageDataUrl:
			'image invalide : une image WebP, JPEG ou PNG en base64 (data:image/…) est attendue',
		draftAnswer: (value: string) =>
			`« ${value} » contient « -> » : l'IA a laissé une correction en cours, garde seulement la bonne réponse`,
		duplicateId: (id: string) => `l'identifiant « ${id} » est utilisé plusieurs fois`,
		duplicateValue: (value: string) => `« ${value} » apparaît plusieurs fois`,
		unknownRef: (id: string, where: string) => `« ${id} » n'existe pas dans ${where}`,
		unknownGenerator: (id: string) =>
			`générateur « ${id} » inconnu : utilise un nom de la liste donnée dans la consigne`,
		scoreTooHigh: 'score.acquired ne peut pas dépasser score.total',
		root: 'document',
		invalidJson: "Ce texte n'est pas un JSON valide.",
		noJsonObject: 'Aucun objet JSON trouvé (il doit commencer par « { » et finir par « } »).'
	}
} as const;
