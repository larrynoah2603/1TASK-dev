# Refonte palette BIOS — validation visuelle

Cette refonte centralise les rôles visuels dans `styles/tokens.css` et conserve les états métier distincts de l’orange de marque.

## Palette de référence

### Clair

- Fond : `#F8F9FB`
- Surface : `#FFFFFF`
- Bordure : `#E2E5E9`
- Texte : `#202124`
- Texte secondaire : `#646567`
- Marque BIOS : `#EA7C29`
- Action principale : `#C4510D`
- Sélection : `#FFF0E4`

### Sombre

- Fond : `#141517`
- Surface : `#1E2023`
- Surface secondaire : `#292C30`
- Bordure : `#3B3E43`
- Texte : `#F5F6F7`
- Texte secondaire : `#B0B4BB`
- Action principale : `#F47F2A`
- Sélection : `#38271D`

## Validation automatisée

`tests/bios-theme-palette.test.ts` verrouille :

- les couleurs de la palette ;
- les contrastes principaux à au moins 4,5:1 ;
- la séparation entre marque, sélection et statuts ;
- les surfaces compactes sensibles au mode sombre ;
- le graphique Dashboard qui ne doit plus utiliser l’ancien indigo en dur.

## Matrice visuelle à exécuter avant merge

La PR ne doit pas être considérée terminée sans validation manuelle sur un déploiement de preview.

| Écran / état | Clair desktop | Sombre desktop | Clair mobile | Sombre mobile |
| --- | --- | --- | --- | --- |
| Dashboard + KPI + graphique | ☐ | ☐ | ☐ | ☐ |
| Inbox + filtres actifs | ☐ | ☐ | ☐ | ☐ |
| Inbox + détails rapides ticket ouverts | ☐ | ☐ | ☐ | ☐ |
| Mes tickets | ☐ | ☐ | ☐ | ☐ |
| Détail ticket + chronologie | ☐ | ☐ | ☐ | ☐ |
| Notifications + filtre actif | ☐ | ☐ | ☐ | ☐ |
| Centre de notifications ouvert | ☐ | ☐ | ☐ | ☐ |
| Administration | ☐ | ☐ | ☐ | ☐ |
| Modale de création / confirmation | ☐ | ☐ | ☐ | ☐ |
| Connexion | ☐ | ☐ | ☐ | ☐ |
| Profil en attente | ☐ | ☐ | ☐ | ☐ |

## Captures attendues dans la PR

Ajouter au minimum quatre captures du déploiement de preview :

1. Dashboard clair desktop.
2. Inbox sombre desktop avec filtre actif et détail rapide ouvert.
3. Modale ou menu ouvert en clair.
4. Une vue mobile sombre.

L’environnement GitHub utilisé pour produire le code ne fournit pas de navigateur graphique authentifié. Les captures doivent donc être ajoutées depuis le déploiement de preview avant de sortir la PR du statut Draft.

## Non-régression

La refonte ne modifie ni permissions, ni routes, ni Prisma, ni logique de tickets, ni actions disponibles. Les statuts succès / avertissement / erreur restent distincts de l’orange BIOS.
