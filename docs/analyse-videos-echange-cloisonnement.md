# Analyse des enregistrements — échange de ticket et cloisonnement

## Faits observés

### Vidéo 1 — Larry

La vidéo commence directement sur la fiche d’un ticket déjà créé. Larry Andrianina est connecté. L’écran affiche le détail du ticket et la section « Faire évoluer le workflow ». Larry renseigne un passage vers un état de blocage, le motif « Information manquante », un détail et un motif d’action administrateur, puis clique sur « Enregistrer la transition ». Une notification « Transition effectuée avec succès » apparaît et le badge du ticket est mis à jour vers un état de blocage.

La vidéo ne montre pas la connexion Microsoft Entra ID, ni la création initiale du ticket, ni la sélection du catalogue.

### Vidéo 2 — Nasolo

La vidéo commence également directement sur une fiche ticket. Nasolo Razafi est connecté avec un profil rattaché à l’administratif, facturation et recouvrement. La fiche indique un ticket demandé par Larry Andrianina, routé vers le département administratif et le service « Administration interne — création d’un compte client ». L’écran montre le récapitulatif, la qualification, le SLA, l’historique, les relations, les pièces jointes et les sections de workflow/commentaires.

La fiche montre un ticket déjà consultable par Nasolo et un historique contenant plusieurs événements et un commentaire interne. La vidéo ne montre pas le moment où Nasolo ouvre `/inbox`, ni la liste des tickets, ni la réception d’une notification au moment exact de la création.

## Interprétation fonctionnelle

Le catalogue route un ticket vers une file, pas directement vers un utilisateur. La notification peut être envoyée à un utilisateur ou à un groupe concerné par la file. La visibilité dans `/inbox` applique ensuite un contrôle plus strict : statut actif, rôle opérationnel, file autorisée, équipe active et appartenance `TeamMember`.

Une notification reçue ne prouve donc pas à elle seule que le ticket doit apparaître dans la boîte agent. Elle indique que le service de notification a identifié le destinataire, tandis que la boîte agent vérifie le périmètre opérationnel.

## Parcours attendu

1. Larry se connecte par Microsoft Entra ID et possède un profil `ACTIVE` dans IT.
2. Larry ouvre « Nouveau ticket » et choisit un service du catalogue.
3. Le service détermine la file cible ADM, la nature, la priorité et le SLA.
4. Le backend crée le ticket avec le département source IT et la file cible ADM.
5. Le ticket commence à `NEW` et n’est pas encore affecté à une personne.
6. Une notification peut être envoyée à Nasolo ou aux destinataires de la file.
7. Nasolo voit le ticket dans `/inbox` uniquement si son rôle et son périmètre couvrent la file ADM.
8. Nasolo réclame ou reçoit l’affectation, puis passe le ticket en traitement.
9. Il ajoute des commentaires, qualifie, bloque si nécessaire ou soumet une résolution.
10. Le demandeur confirme ou le processus autorisé clôture le ticket.
11. Un agent IT hors du périmètre ADM ne doit pas voir le ticket, même avec une URL directe.

## Cloisonnement

Pour Nasolo, les conditions importantes sont : `User.status = ACTIVE`, rôle `AGENT` ou `QUEUE_MANAGER`, département ADM, `authorizedQueueId` correspondant à la file cible, équipe active attachée à cette file et ligne `TeamMember` active. Pour un agent IT hors périmètre, `authorizedQueueId` doit rester une file IT et aucune équipe ADM ne doit être active pour cet utilisateur.

## Conclusion

Les vidéos montrent correctement la consultation et l’évolution d’un ticket par Larry et Nasolo, mais elles ne montrent pas la totalité de la création ni le passage par la liste `/inbox`. Elles permettent toutefois de confirmer que le ticket atteint la fiche Nasolo et que le workflow, le SLA, les commentaires et l’historique sont visibles. Le point à contrôler séparément est l’écart entre la notification et la visibilité de la boîte agent.
