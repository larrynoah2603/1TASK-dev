import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

function source(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("lot 4 identity industrial visual contract", () => {
  it("keeps authenticated notification retrieval and the existing notification endpoints", () => {
    const page = source("app/(app)/notifications/page.tsx");
    const list = source("components/notification-list.tsx");
    const center = source("components/notification-center.tsx");

    expect(page).toContain("requireAuthenticatedUser()");
    expect(page).toContain("listUserNotifications(user, 100)");
    expect(list).toContain('fetchWithTimeout("/api/notifications?take=100"');
    expect(list).toContain('fetchWithTimeout("/api/notifications/read-all"');
    expect(center).toContain('fetchWithTimeout("/api/notifications?take=8"');
    expect(center).toContain('fetchWithTimeout("/api/notifications/read-all"');
    expect(page).toContain("notification-industrial");
  });

  it("keeps profile identity data read-only with role-aware administrative navigation", () => {
    const page = source("app/(app)/profile/page.tsx");
    const menu = source("components/profile-menu.tsx");

    expect(page).toContain("requireAuthenticatedUser()");
    expect(page).toContain("roleCodes(user)");
    expect(page).toContain("Microsoft Entra ID reste la source de l’identité");
    expect(menu).toContain("{admin ? <Link href=\"/admin\"");
    expect(menu).toContain('href="/api/auth/signout"');
    expect(page).toContain("profile-industrial");
  });

  it("keeps pending-access session redirects before showing the administrative message", () => {
    const pending = source("app/pending-assignment/page.tsx");

    expect(pending).toContain("getSessionUserContext()");
    expect(pending).toContain('if (!user) redirect("/signin")');
    expect(pending).toContain('if (user.status === "ACTIVE") redirect("/dashboard")');
    expect(pending).toContain('href="/api/auth/signout"');
    expect(pending).toContain("pending-industrial");
  });

  it("contains a scoped lot 4 palette without new blue or violet accents", () => {
    const css = source("app/globals.css");
    const lotFour = css.slice(css.indexOf("Lot 4 — identité et communication industrielles"));

    expect(lotFour).toContain(".identity-industrial");
    expect(lotFour).toContain(".pending-industrial");
    expect(lotFour).not.toMatch(/blue|cyan|indigo|violet|#4c4dba|#5b5bd6/i);
  });
});
