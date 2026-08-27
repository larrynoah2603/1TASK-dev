import { redirect } from "next/navigation";
import { RoleCode } from "@prisma/client";
import { KnowledgeListClient } from "@/components/knowledge-list-client";
import { prisma } from "@/lib/db";
import { listKnowledgeArticles } from "@/lib/knowledge-service";
import { getSessionUserContext, permissionCodes, roleCodes } from "@/lib/server-auth";

export default async function KnowledgePage() {
  const user = await getSessionUserContext();
  if (!user) return null;
  const permissions = permissionCodes(user);
  const canManage = permissions.includes("knowledge:manage");
  if (!permissions.includes("knowledge:read") && !canManage) redirect("/dashboard");
  const isGlobalAdmin = roleCodes(user).includes(RoleCode.FUNCTIONAL_ADMIN);
  const [articles, departments] = await Promise.all([
    listKnowledgeArticles(user),
    canManage ? prisma.department.findMany({ where: isGlobalAdmin ? { isActive: true } : { id: user.departmentId ?? "__none__", isActive: true }, select: { id: true, code: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  return <div className="space-y-5 knowledge-page-shell knowledge-industrial"><header className="page-header"><div><p className="eyebrow">Référentiel partagé</p><h1 className="mt-1">Base de connaissances</h1><p className="page-header-description mt-1">Consultez les procédures publiées dans votre périmètre et capitalisez les solutions réutilisables.</p></div></header><KnowledgeListClient initialArticles={articles.map((article) => ({ ...article, status: article.status, reviewAt: article.reviewAt?.toISOString() ?? null, updatedAt: article.updatedAt.toISOString() }))} departments={departments} canManage={canManage} /></div>;
}
