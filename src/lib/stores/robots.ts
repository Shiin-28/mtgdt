/**
 * Minimal robots.txt support: groups by User-agent, Allow/Disallow with `*`
 * and `$` wildcards, longest match wins, Allow wins ties (RFC 9309).
 */
export type RobotsRules = { allow: string[]; disallow: string[] };

export function parseRobots(text: string, userAgent: string): RobotsRules {
  const agent = userAgent.toLowerCase();
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" && value) current.allow.push(value);
    if (key === "disallow" && value) current.disallow.push(value);
  }

  // Rules for our agent if any group names it, otherwise every "*" group combined.
  const named = groups.filter((g) => g.agents.some((a) => a !== "*" && agent.includes(a)));
  const chosen = named.length ? named : groups.filter((g) => g.agents.includes("*"));
  return {
    allow: chosen.flatMap((g) => g.allow),
    disallow: chosen.flatMap((g) => g.disallow),
  };
}

function patternLength(pattern: string, path: string): number {
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/[.+?^${}()|[\]\\]/g, (c) => (c === "$" ? c : "\\" + c))
        .replace(/\*/g, ".*")
        .replace(/\\\$$|\$$/, "$"),
  );
  return regex.test(path) ? pattern.length : -1;
}

/** Is `pathWithQuery` (e.g. "/search?q=x") allowed under these rules? */
export function isAllowed(rules: RobotsRules, pathWithQuery: string): boolean {
  let best = -1;
  let allowed = true;
  for (const p of rules.disallow) {
    const n = patternLength(p, pathWithQuery);
    if (n > best) {
      best = n;
      allowed = false;
    }
  }
  for (const p of rules.allow) {
    const n = patternLength(p, pathWithQuery);
    if (n >= best && n >= 0) {
      best = n;
      allowed = true;
    }
  }
  return allowed;
}
