import { Priority, TicketType } from "@prisma/client";

export interface CatalogCandidate {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  ticketType: TicketType;
  category: string;
  queueId: string;
  priorityDefault: Priority;
  keywords: string[];
}

export type CatalogMatchMethod = "catalog-id" | "keyword" | "name" | "category" | "text";

export interface RoutingDecision {
  serviceCatalogItemId: string;
  queueId: string;
  type: TicketType;
  category: string;
  priority: Priority;
  matchedBy: CatalogMatchMethod;
}

export function normalizeRoutingText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildRoutingDecision(
  candidate: CatalogCandidate,
  matchedBy: CatalogMatchMethod,
): RoutingDecision {
  return {
    serviceCatalogItemId: candidate.id,
    queueId: candidate.queueId,
    type: candidate.ticketType,
    category: candidate.category,
    priority: candidate.priorityDefault,
    matchedBy,
  };
}

export function routeTicketFromCatalog(input: {
  serviceCatalogItemId: string;
  candidates: CatalogCandidate[];
}): RoutingDecision {
  const selected = input.candidates.find((candidate) => candidate.id === input.serviceCatalogItemId);
  if (!selected) throw new Error("Aucun service du catalogue ne correspond à la demande.");
  return buildRoutingDecision(selected, "catalog-id");
}

type MatchInput = {
  requestedService?: string | null;
  title?: string | null;
  description?: string | null;
  candidates: CatalogCandidate[];
};

type ScoredCandidate = { candidate: CatalogCandidate; score: number; matchedBy: Exclude<CatalogMatchMethod, "catalog-id"> };

function containsPhrase(text: string, phrase: string): boolean {
  return phrase.length >= 3 && (` ${text} `).includes(` ${phrase} `);
}

function scoreCandidate(candidate: CatalogCandidate, fields: string[]): ScoredCandidate {
  const name = normalizeRoutingText(candidate.name);
  const category = normalizeRoutingText(candidate.category);
  const description = normalizeRoutingText(candidate.description ?? "");
  const keywords = [...new Set(candidate.keywords.map(normalizeRoutingText).filter((keyword) => keyword.length >= 3))];
  let score = 0;
  let matchedBy: ScoredCandidate["matchedBy"] = "text";

  fields.forEach((field, index) => {
    const weight = index === 0 ? 1.25 : index === 1 ? 1 : 0.7;
    if (field === name) {
      score += 180 * weight;
      matchedBy = "name";
    } else if (containsPhrase(field, name)) {
      score += 110 * weight;
      if (matchedBy !== "keyword") matchedBy = "name";
    }
    if (field === category) {
      score += 75 * weight;
      if (matchedBy === "text") matchedBy = "category";
    } else if (containsPhrase(field, category)) {
      score += 45 * weight;
      if (matchedBy === "text") matchedBy = "category";
    }
    const keywordHits = keywords.filter((keyword) => containsPhrase(field, keyword));
    if (keywordHits.length) {
      score += (95 + Math.min(keywordHits.length - 1, 3) * 25) * weight;
      matchedBy = "keyword";
    }
    const descriptionTokens = new Set(description.split(" ").filter((token) => token.length >= 5));
    const textTokens = new Set(field.split(" ").filter((token) => token.length >= 5));
    const overlap = [...descriptionTokens].filter((token) => textTokens.has(token)).length;
    score += Math.min(overlap, 3) * 8 * weight;
  });
  return { candidate, score, matchedBy };
}

/** Deterministic, conservative free-text matching. Triage services are fallback-only. */
export function matchCatalogService(input: MatchInput): RoutingDecision | null {
  const fields = [input.requestedService, input.title, input.description]
    .map((value) => normalizeRoutingText(value ?? ""))
    .filter(Boolean);
  if (!fields.length) return null;

  const ranked = input.candidates
    .filter((candidate) => !candidate.code.toUpperCase().startsWith("TRIAGE-"))
    .map((candidate) => scoreCandidate(candidate, fields))
    .sort((left, right) => right.score - left.score || left.candidate.code.localeCompare(right.candidate.code));
  const best = ranked[0];
  const runnerUp = ranked[1];
  // One strong semantic signal is required, and close candidates are treated as ambiguous.
  if (!best || best.score < 80 || (runnerUp && runnerUp.score >= best.score - 20)) return null;
  return buildRoutingDecision(best.candidate, best.matchedBy);
}

export interface AssignmentCandidate {
  userId: string;
  isAvailable: boolean;
  isActive: boolean;
  skills: string[];
  openTicketCount: number;
  absentUntil?: Date | null;
}

export function chooseAutoAssignmentCandidate(
  candidates: AssignmentCandidate[],
  requiredSkills: string[] = [],
  now = new Date(),
): AssignmentCandidate | null {
  const normalize = (value: string) => normalizeRoutingText(value).replace(/\s/g, "");
  const required = requiredSkills.map(normalize);
  const eligible = candidates.filter((candidate) => {
    const available = candidate.isActive && candidate.isAvailable;
    const absent = candidate.absentUntil ? candidate.absentUntil > now : false;
    const skills = candidate.skills.map(normalize);
    const hasSkills = required.every((skill) => skills.includes(skill));
    return available && !absent && hasSkills;
  });

  return eligible.sort((a, b) => a.openTicketCount - b.openTicketCount || a.userId.localeCompare(b.userId))[0] ?? null;
}
