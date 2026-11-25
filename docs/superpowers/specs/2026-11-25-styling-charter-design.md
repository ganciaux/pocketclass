# Charte graphique « trousse d'écolier » — design (court)

Date : 25 novembre 2026. Statut : validé par l'utilisateur.

## Idée

Les couleurs de la trousse d'un collégien : le prof corrige en **rouge** et **vert**, l'élève
écrit en **bleu**, on **surligne en jaune** ce qu'il faut faire, le **crayon à papier** est
le brouillon. Une couleur garde le même sens partout.

## Boutons (hiérarchie par l'intensité, la couleur porte le sens)

| Rôle | Classes daisyUI |
| --- | --- |
| Action principale (une par moment) | `btn-primary` |
| Navigation, aller ailleurs | `btn-soft btn-primary` |
| Secondaire, annuler, outils | `btn-ghost` |
| Voix de l'enfant (remarques) | `btn-secondary` |
| Réponse « je savais » (résultat) | `btn-soft btn-success` / `btn-soft btn-error` |
| Supprimer, délier | `btn-soft btn-error` + corbeille ; confirmation finale `btn-error` |

Plus de bouton `btn` sans rôle.

## États d'une fiche (filtre = pastille = repère = tampon)

| État | Couleur |
| --- | --- |
| Toutes (pas un état) | encre (neutre) |
| Nouvelle / mise à jour | bleu |
| En cours (ex-« Commencée ») | graphite (gris) |
| Lue | vert doux + coche |
| Acquise | vert plein + étoile ; tampon « Acquise » vert |
| Ratée | rouge + visage triste |

Filtre désactivé = contour de sa couleur, activé = rempli. Classes centralisées dans
`binder/colors.ts` (`STATUS_CHIP`, `STATUS_BADGE`, `STATUS_STEP`).

## Listes du parent

Une carte par groupe, lignes séparées ; survol de la ligne = fond surligneur pâle + titre
souligné ; toute la ligne ouvre l'élément (lien étiré), les actions restent cliquables à
droite. Pas de nouvelle animation.
