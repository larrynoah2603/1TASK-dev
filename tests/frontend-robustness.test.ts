import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("robustesse du frontend notifications", () => {
  for (const component of ["components/notification-center.tsx", "components/notification-list.tsx"]) {
    it(`${component} ne confirme une mutation qu'après une réponse réussie`, () => {
      const implementation = source(component);

      expect(implementation).toContain("fetchWithTimeout");
      expect(implementation).toContain("if (!response.ok) throw new Error");
      expect(implementation).toContain("finally");
      expect(implementation).toContain('role="alert"');
    });
  }
});
