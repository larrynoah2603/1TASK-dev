import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("delete actions use a consistent icon trigger", () => {
  it("uses the shared trash icon for destructive action triggers", () => {
    const iconSource = source("components/ui/icons.tsx");
    const deleteButton = source("components/ui/delete-icon-button.tsx");

    expect(iconSource).toContain("trash:");
    expect(deleteButton).toContain('name="trash"');
    expect(deleteButton).toContain("aria-label={label}");
    expect(deleteButton).toContain("title={label}");
  });

  it("replaces visible Supprimer trigger labels in admin pages", () => {
    const configuration = source("components/admin-configuration-panel.tsx");
    const users = source("components/admin-user-actions.tsx");

    expect(configuration).not.toContain(">Supprimer</button>");
    expect(users).not.toContain(">Supprimer</button>");
    expect(configuration.match(/<DeleteIconButton/g)?.length).toBe(4);
    expect(users.match(/<DeleteIconButton/g)?.length).toBe(1);
  });

  it("keeps explicit wording in destructive confirmation dialogs", () => {
    const configuration = source("components/admin-configuration-panel.tsx");
    const users = source("components/admin-user-actions.tsx");

    expect(configuration).toContain('confirmLabel="Supprimer définitivement"');
    expect(users).toContain('confirmLabel="Supprimer définitivement"');
  });
});
