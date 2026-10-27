import { describe, expect, it } from "vitest";
import { isAllowed, parseRobots } from "./robots";

const UA = "MTGDeckTracker/0.1";

describe("robots.txt", () => {
  it("blocks everything for Disallow: /", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /", UA);
    expect(isAllowed(rules, "/")).toBe(false);
    expect(isAllowed(rules, "/products/sol-ring")).toBe(false);
  });

  it("allows everything for an empty Disallow", () => {
    const rules = parseRobots("User-agent: *\nDisallow:", UA);
    expect(isAllowed(rules, "/input/search?searchTerm=sol")).toBe(true);
  });

  it("handles wildcards in query rules (Block 101 / Infinity style)", () => {
    const rules = parseRobots(
      "User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n\nUser-agent: *\nDisallow: /*?s=\nDisallow: /*&s=\nDisallow: /*?search=",
      UA,
    );
    expect(isAllowed(rules, "/?s=sol+ring&post_type=product")).toBe(false);
    expect(isAllowed(rules, "/?post_type=product&s=sol")).toBe(false);
    expect(isAllowed(rules, "/products/singles?search=sol")).toBe(false);
    expect(isAllowed(rules, "/shop/magic-the-gathering/x/sol-ring/")).toBe(true);
    expect(isAllowed(rules, "/wp-admin/admin-ajax.php")).toBe(true);
    expect(isAllowed(rules, "/wp-admin/options.php")).toBe(false);
  });

  it("prefers the longest matching rule, Allow winning ties", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /shop\nAllow: /shop/cards", UA);
    expect(isAllowed(rules, "/shop/cards/1")).toBe(true);
    expect(isAllowed(rules, "/shop/sleeves")).toBe(false);
  });

  it("supports $ end anchors", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /*.json$", UA);
    expect(isAllowed(rules, "/products/x.json")).toBe(false);
    expect(isAllowed(rules, "/products/x.json?v=1")).toBe(true);
  });

  it("uses a group naming our agent over the * group", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /\n\nUser-agent: MTGDeckTracker\nDisallow: /private", UA);
    expect(isAllowed(rules, "/mtg/?cardname=sol")).toBe(true);
    expect(isAllowed(rules, "/private/x")).toBe(false);
  });
});
