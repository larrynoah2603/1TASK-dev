# Pull requests créées avec Codex

Lorsqu’une pull request existante a été créée ou modifiée en dehors de Codex, Codex peut ne pas être autorisé à la mettre à jour directement. Dans ce cas, la livraison doit suivre ce processus :

1. conserver les commits validés sur la branche de travail courante ;
2. créer une nouvelle pull request depuis cette branche avec un titre et une description à jour ;
3. référencer l’ancienne pull request dans la nouvelle si un lien est disponible ;
4. fermer ou remplacer l’ancienne pull request seulement après vérification de la nouvelle ;
5. ne jamais réécrire l’historique partagé ni forcer un push uniquement pour contourner cette limitation.

Ce processus ne modifie ni le code applicatif, ni les migrations, ni les règles métier. Il garantit simplement qu’une nouvelle pull request traçable est produite lorsque la mise à jour de la précédente n’est pas prise en charge.
