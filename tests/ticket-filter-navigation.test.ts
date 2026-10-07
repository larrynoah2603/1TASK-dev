import { describe, expect, it } from "vitest";
import { buildTicketFilterHref, buildTicketFilterPatchHref } from "@/lib/ticket-filter-navigation";

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

  it("patches a quick view while preserving the other active filters", () => {
    const href = buildTicketFilterPatchHref(
      "/inbox",
      "q=vpn&status=IN_PROGRESS&priority=HIGH&scope=mine&sla=attention&cursor=abc&tab=operations",
      { scope: "team", sla: "" },
    );

    const url = new URL(href, "https://example.test");
    expect(url.searchParams.get("q")).toBe("vpn");
    expect(url.searchParams.get("status")).toBe("IN_PROGRESS");
    expect(url.searchParams.get("priority")).toBe("HIGH");
    expect(url.searchParams.get("scope")).toBe("team");
    expect(url.searchParams.has("sla")).toBe(false);
    expect(url.searchParams.get("tab")).toBe("operations");
    expect(url.searchParams.has("cursor")).toBe(false);
  });
});
