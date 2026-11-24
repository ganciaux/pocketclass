# Mot de passe parent — design (court)

Date : 24 novembre 2026. Statut : validé par l'utilisateur.

## Intention

Sur iPhone (app installée), le parent doit souvent se reconnecter avec Google, ce qui est lourd.
Il veut pouvoir se connecter avec un e-mail et un mot de passe **sur le même compte** (même
famille, toujours admin). En plus, l'app demande à iOS de garder ses données pour un parent.

## Non-objectifs, anti-objectifs

- Pas de création de compte e-mail dans l'app (un compte à part = une famille vide).
- Pas de mot de passe pour les enfants (comptes anonymes liés par code).
- Anti-objectif : un parent qui se retrouve dans une autre famille, ou sans accès admin.

## Approches

| Option | Retenue ? |
| --- | --- |
| **Rattacher un mot de passe au compte Google existant** (`linkWithCredential`) : même uid | **Oui (validée)** |
| Second compte e-mail ajouté comme deuxième admin de la famille | Non : règles, index `users/{uid}` et premier login à revoir |

## Design

- **Mon profil** (parent connecté avec un compte non anonyme qui a un e-mail) : carte « Mot de
  passe ». E-mail affiché = celui du compte (non modifiable), champs mot de passe + confirmation.
  Sans mot de passe : « Définir le mot de passe » (`linkWithCredential` avec
  `EmailAuthProvider.credential(email, password)`). Avec : « Changer le mot de passe »
  (`updatePassword`). Si Firebase répond `auth/requires-recent-login` : reconnexion Google
  automatique (`reauthenticateWithPopup`), puis un seul nouvel essai.
- **Écran de connexion**, carte « Je suis un parent » : sous le bouton Google, un séparateur
  « ou », un formulaire e-mail / mot de passe (`signInWithEmailAndPassword`) et « Mot de passe
  oublié ? » (`sendPasswordResetEmail` sur l'e-mail saisi ; message neutre ensuite).
- **Session** : `navigator.storage.persist()` demandé après le chargement d'un parent (déjà fait
  pour les enfants au moment de la liaison).
- **Logique pure** `src/lib/account/password.ts` (testée) : `PASSWORD_MIN = 8`,
  `passwordProblem(password, confirm)` → `'tooShort' | 'mismatch' | null`,
  `authErrorKey(code)` → clé de message français.
- Appels Firebase dans `auth.svelte.ts` (comme la connexion Google) ; textes dans `fr.ts`
  (section `account`). Aucune règle Firestore ne change.

## Choix faits par Claude (validés)

8 caractères minimum ; l'e-mail est celui du compte Google.
