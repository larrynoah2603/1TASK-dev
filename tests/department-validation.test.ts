import { describe, expect, it } from "vitest";
import { normalizeEntraDepartmentValue } from "@/lib/department-mapping";

describe("provisioning du département Entra", () => {
  it("normalise les accents, la casse et les espaces sans modifier la valeur source", () => {
    expect(normalizeEntraDepartmentValue("  Expertise   Comptable ")).toBe("expertise comptable");
    expect(normalizeEntraDepartmentValue("Ressources Humaines")).toBe("ressources humaines");
  });

  it("permet de retrouver la même correspondance malgré les variations de profil", () => {
    expect(normalizeEntraDepartmentValue("DSI")).toBe(normalizeEntraDepartmentValue("dsi"));
  });
});
