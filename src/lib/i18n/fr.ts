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
		noAssignedPaths: 'Aucun parcours affecté pour le moment.'
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
	}
} as const;
