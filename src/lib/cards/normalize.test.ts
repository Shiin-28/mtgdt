import { describe, expect, it } from "vitest";
import { frontFace, normalizeName } from "./normalize";

describe("normalizeName", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(normalizeName("  SOL RING ")).toBe("sol ring");
  });

  it("strips accents and expands ligatures", () => {
    expect(normalizeName("Jötun Grunt")).toBe("jotun grunt");
    expect(normalizeName("Æther Vial")).toBe("aether vial");
    expect(normalizeName("Lim-Dûl's Vault")).toBe("lim duls vault");
  });

  it("treats straight and curly apostrophes the same", () => {
    expect(normalizeName("Urza's Saga")).toBe(normalizeName("Urza’s Saga"));
    expect(normalizeName("Atraxa, Praetors' Voice")).toBe("atraxa praetors voice");
  });

  it("drops punctuation and collapses spaces", () => {
    expect(normalizeName("Borborygmos  Enraged!")).toBe("borborygmos enraged");
    expect(normalizeName("Kongming, \"Sleeping Dragon\"")).toBe("kongming sleeping dragon");
  });

  it("standardises the double-faced separator", () => {
    const want = "delver of secrets // insectile aberration";
    expect(normalizeName("Delver of Secrets // Insectile Aberration")).toBe(want);
    expect(normalizeName("Delver of Secrets//Insectile Aberration")).toBe(want);
    expect(normalizeName("Delver of Secrets / Insectile Aberration")).toBe(want);
  });
});

describe("frontFace", () => {
  it("returns the front face of a multi-face name", () => {
    expect(frontFace("Delver of Secrets // Insectile Aberration")).toBe("Delver of Secrets");
    expect(frontFace("Fire//Ice")).toBe("Fire");
  });

  it("returns single-faced names unchanged", () => {
    expect(frontFace("Sol Ring")).toBe("Sol Ring");
  });
});
