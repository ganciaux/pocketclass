# Statistiques d'un enfant — design (court)

Date : 25 novembre 2026. Statut : validé par l’utilisateur. Choix de l'utilisateur : deux compteurs en plus
de l'existant ; une vue globale et une vue détaillée avec les derniers essais.

## Ce qu'on mesure

| Chiffre | Source | Depuis |
| --- | --- | --- |
| Fiches lues / acquises / ratées | `progress` (existant) | toujours |
| Ouvertures d'une fiche | **nouveau** `progress.openCount` (+1 par visite de la fiche) | la mise en ligne |
| Entraînements lancés | **nouveaux** `progress.seriesStarted`, `challengeStarted`, `assessmentStarted` (+1 au démarrage) | la mise en ligne |
| Entraînements terminés, scores, dates | `attempts` (existant : séries, défis, contrôles terminés) | toujours |
| Points | `profile.points`, `progress.assessmentPoints` (existant) | toujours |

- Compteurs écrits avec `increment(1)` dans `inBackground()` : marchent hors ligne.
- Une ouverture = une visite de la page fiche (une fois par fiche affichée, pas à chaque mise à
  jour des données de la fiche).
- « Lancé » = une série démarrée (« Nouvelle série » compte, « Refaire mes erreurs » non : ce
  rejeu n'est pas enregistré), un défi démarré, un contrôle démarré. Abandonné = lancés −
  terminés.
- Pas comptés : les tests de la carte mentale (pas de score enregistré, pas demandé).
- Règles Firestore : chaque compteur est un entier, absent ou **égal à l'ancien + 1** (ou 1 à
  la création) pour l'appareil de l'enfant ; cas de test ajoutés.
- Remise à zéro du mode test, suppression d'un profil ou d'une fiche : les compteurs sont sur
  `progress`, déjà effacé dans ces trois cas. Rien à ajouter.

## Page `/parent/stats`

- Bouton « Statistiques » dans l'espace parent, et lien depuis la page d'un enfant (ouvre la
  page sur cet enfant).
- En haut, des puces pour choisir l'enfant ; une puce « Mes tests » pour le parent s'il a des
  données de test (pour vérifier le mode test).

**Vue globale** (un enfant) :
- un bandeau : points, fiches lues, fiches acquises, entraînements terminés, dernière activité ;
- une carte par classeur (couleur et icône de la matière, comme l'accueil) : lues / acquises /
  ratées, ouvertures, séries lancées / terminées, score moyen des séries, meilleur défi,
  contrôles réussis / ratés, dernière activité. La carte ouvre la vue détaillée.

**Vue détaillée** (un classeur, `?subject=`) :
- par chapitre, une ligne par fiche : ouvertures, séries lancées / terminées, dernier et
  meilleur score, record du défi, contrôle (meilleur score, Acquise / Raté) ;
- puis « Derniers essais » : les 20 plus récents du classeur (date, heure, fiche, type —
  Entraînement / Défi / Contrôle —, score).

## Code

- Pur, testé : `src/lib/stats/stats.ts` — `sheetStats(progress, attempts)`,
  `subjectStats(sheets, progress, attempts)`, `childSummary(...)`,
  `recentAttempts(attempts, subjectId, 20)`.
- Données : `watchAttempts(familyId, profileId)` (cache d'abord) ; `countOpen`,
  `countStart(mode)` dans `data/progress.ts`.
- Écritures des compteurs : page fiche (ouverture), pages entraînement / défi / contrôle
  (démarrage).
- Hors périmètre : graphique par semaine, export des statistiques.

## Précision validée (25 novembre)

- Lancés connus seulement depuis la mise en ligne : quand le compteur « lancés » est plus petit
  que le nombre de terminés (essais d'avant), on n'affiche que « n terminés » ; sinon
  « n terminés / m lancés ». Pas de chiffre « abandonnés » faux.
- Carte mentale : pas comptée.
