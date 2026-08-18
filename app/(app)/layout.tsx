import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUserContext } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUserContext();
  if (!user) redirect("/signin");
  if (user.status === "PENDING_VALIDATION" || user.status === "PENDING_ASSIGNMENT") {
    redirect("/pending-assignment");
  }
  if (user.status !== "ACTIVE") redirect("/signin?error=AccountDisabled");
  return <AppShell user={user}>{children}</AppShell>;
}
