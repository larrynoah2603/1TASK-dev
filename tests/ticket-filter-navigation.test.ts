import { describe, expect, it } from "vitest";
import { buildTicketFilterHref, buildTicketViewHref } from "@/lib/ticket-filter-navigation";

describe("ticket filter navigation", () => {
  it("preserves unrelated URL parameters and resets pagination", () => {
    const href = buildTicketFilterHref(
      "/inbox",
      "page=4&cursor=abc&tab=operations&scope=all",
      {
        q: "  incident VPN  ",
        scope: "mine",
        status: "",
        priority: "HIGH",
      },
    );

    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/inbox");
    expect(url.searchParams.get("tab")).toBe("operations");
    expect(url.searchParams.get("q")).toBe("incident VPN");
    expect(url.searchParams.get("scope")).toBe("mine");
    expect(url.searchParams.get("priority")).toBe("HIGH");
    expect(url.searchParams.has("status")).toBe(false);
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("cursor")).toBe(false);
  });

  it("removes empty filter values instead of serializing empty parameters", () => {
    const href = buildTicketFilterHref(
      "/tickets",
      "q=old&status=OPEN&view=compact",
      { q: "", status: "", scope: "requested" },
    );

    const url = new URL(href, "https://example.test");
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.has("status")).toBe(false);
    expect(url.searchParams.get("scope")).toBe("requested");
    expect(url.searchParams.get("view")).toBe("compact");
  });

  it("changes quick views without dropping active filters", () => {
    const href = buildTicketViewHref(
      "/inbox",
      "q=vpn&status=NEW&priority=HIGH&departmentId=dep-1&queueId=q-1&page=3&cursor=abc",
      { scope: "mine", sla: null },
    );

    const url = new URL(href, "https://example.test");
    expect(url.searchParams.get("q")).toBe("vpn");
    expect(url.searchParams.get("status")).toBe("NEW");
    expect(url.searchParams.get("priority")).toBe("HIGH");
    expect(url.searchParams.get("departmentId")).toBe("dep-1");
    expect(url.searchParams.get("queueId")).toBe("q-1");
    expect(url.searchParams.get("scope")).toBe("mine");
    expect(url.searchParams.has("sla")).toBe(false);
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("cursor")).toBe(false);
  });

  it("treats SLA shortcuts as a separate dimension from ownership scope", () => {
    const href = buildTicketViewHref(
      "/inbox",
      "scope=team&q=routeur&status=IN_PROGRESS",
      { sla: "attention" },
    );

    const url = new URL(href, "https://example.test");
    expect(url.searchParams.get("scope")).toBe("team");
    expect(url.searchParams.get("sla")).toBe("attention");
    expect(url.searchParams.get("q")).toBe("routeur");
    expect(url.searchParams.get("status")).toBe("IN_PROGRESS");
  });
});
