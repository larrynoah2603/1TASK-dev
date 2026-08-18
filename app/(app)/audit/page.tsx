import { redirect } from "next/navigation";
import type { Route } from "next";

export default async function AuditPage() {
  redirect("/admin/audit" as Route);
}
