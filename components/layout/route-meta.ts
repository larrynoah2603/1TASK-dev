/** Titre de page + fil d'Ariane, dérivés de l'URL. Présentation uniquement. */
export type Crumb = { label: string; href?: string };

const LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  tickets: "Tickets",
  new: "Nouveau ticket",
  inbox: "Boîte agent",
  queues: "Files",
  reporting: "Reporting",
  profile: "Mon profil",
  notifications: "Notifications",
  audit: "Audit",
  admin: "Administration",
  users: "Utilisateurs",
  roles: "Rôles et permissions",
  departments: "Départements",
  teams: "Équipes",
  catalog: "Catalogue",
  sla: "SLA",
  technical: "Technique",
  responsible: "Pilotage SLA",
  operations: "Opérations",
  missions: "Missions",
  clients: "Clients",
  dossiers: "Dossiers",
  knowledge: "Base de connaissances",
  assets: "Actifs",
};

/** Libellé d'une page de détail (segment dynamique : identifiant). */
const DETAIL_LABELS: Record<string, string> = {
  tickets: "Détail du ticket",
  clients: "Fiche client",
  dossiers: "Dossier",
  missions: "Mission",
  assets: "Actif",
  knowledge: "Article",
};

export function getRouteMeta(pathname: string): { title: string; crumbs: Crumb[]; admin: boolean } {
  const segments = pathname.split("/").filter(Boolean);
  const admin = segments[0] === "admin";
  const items: Crumb[] = [];
  let current = "";
  segments.forEach((segment, index) => {
    current += `/${segment}`;
    const parent = segments[index - 1];
    const label = LABELS[segment] ?? (parent && DETAIL_LABELS[parent] ? DETAIL_LABELS[parent] : segment.replaceAll("-", " "));
    items.push({ label, href: current });
  });

  if (!items.length) return { title: "1TASK", crumbs: [], admin };
  const last = items[items.length - 1];
  // La racine de l'espace (dashboard / admin) porte le titre « Vue d'ensemble » côté admin.
  const title = admin && items.length === 1 ? "Vue d’ensemble" : last.label;
  const ancestors = items.slice(0, -1).filter((item) => !(admin && item.href === "/admin" && items.length === 1));
  const crumbs: Crumb[] = ancestors.length ? ancestors : [{ label: admin ? "Console d’administration" : "1TASK" }];
  return { title, crumbs, admin };
}
