import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getSessionUserContext, requireAdminAccess } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await getSessionUserContext();
  if (!sessionUser) redirect("/signin");
  if (
    sessionUser.status !== "ACTIVE" &&
    sessionUser.status !== "PENDING_VALIDATION" &&
    sessionUser.status !== "PENDING_ASSIGNMENT"
  ) {
    redirect("/signin?error=AccountDisabled");
  }

  let admin: Awaited<ReturnType<typeof requireAdminAccess>>;
  try {
    admin = await requireAdminAccess("ANY");
  } catch (error) {
    if (typeof error === "object" && error !== null && "statusCode" in error && Number((error as { statusCode?: number }).statusCode) === 403) {
      redirect("/dashboard?error=AdminAccessDenied");
    }
    throw error;
  }
  return <AdminShell user={admin}>{children}</AdminShell>;
}
