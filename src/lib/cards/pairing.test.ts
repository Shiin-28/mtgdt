import { describe, expect, it } from "vitest";
import { canPair, pairingOf, parsePartnerGroup, parsePartnerWith, partnerQuery, type PairingCard } from "./pairing";

const card = (
  name: string,
  typeLine: string,
  keywords: string[] = [],
  extra: Partial<Pick<PairingCard, "partnerWith" | "partnerGroup">> = {},
): PairingCard => ({ name, typeLine, keywords, partnerWith: null, partnerGroup: null, ...extra });

// Keywords as Scryfall reports them.
const thrasios = card("Thrasios, Triton Hero", "Legendary Creature — Merfolk Wizard", ["Partner", "Scry"]);
const tymna = card("Tymna the Weaver", "Legendary Creature — Human Cleric", ["Partner"]);
const pir = card("Pir, Imaginative Rascal", "Legendary Creature — Human", ["Partner with", "Partner"], {
  partnerWith: "Toothy, Imaginary Friend",
});
const toothy = card("Toothy, Imaginary Friend", "Legendary Creature — Illusion", ["Partner with", "Partner"], {
  partnerWith: "Pir, Imaginative Rascal",
});
const proudMentor = card("Proud Mentor", "Creature — Human Warrior", ["Partner with", "Partner"], {
  partnerWith: "Impetuous Protege",
});
const bjorna = card("Bjorna, Nightfall Alchemist", "Legendary Creature — Human Wizard", ["Goad", "Partner"], {
  partnerGroup: "Friends forever",
});
const cecily = card("Cecily, Haunted Mage", "Legendary Creature — Human Wizard", ["Partner"], {
  partnerGroup: "Friends forever",
});
const abby = card("Abby, Merciless Soldier", "Legendary Creature — Human Soldier", ["Partner"], {
  partnerGroup: "Survivors",
});
const wilson = card("Wilson, Refined Grizzly", "Legendary Creature — Bear Warrior", ["Reach", "Choose a background"]);
const background = card("Raised by Giants", "Legendary Enchantment — Background");
const clara = card("Clara Oswald", "Legendary Creature — Human Advisor", ["Impossible Girl", "Doctor's companion"]);
const doctor = card("The Eleventh Doctor", "Legendary Creature — Time Lord Doctor");
const azula = card("Fire Lord Azula", "Legendary Creature — Human Noble", ["Firebending"]);

describe("pairingOf", () => {
  it("recognises each pairing ability", () => {
    expect(pairingOf(thrasios)).toEqual({ kind: "partner" });
    expect(pairingOf(pir)).toEqual({ kind: "partner-with", name: "Toothy, Imaginary Friend" });
    expect(pairingOf(bjorna)).toEqual({ kind: "partner-group", group: "Friends forever" });
    expect(pairingOf(wilson)).toEqual({ kind: "choose-background" });
    expect(pairingOf(background)).toEqual({ kind: "background" });
    expect(pairingOf(clara)).toEqual({ kind: "doctors-companion" });
    expect(pairingOf(doctor)).toEqual({ kind: "doctor" });
  });

  it("returns null for commanders that can't pair", () => {
    expect(pairingOf(azula)).toBeNull();
  });
});

describe("canPair", () => {
  it("allows legal pairs in either order", () => {
    expect(canPair(thrasios, tymna)).toBe(true);
    expect(canPair(pir, toothy)).toBe(true);
    expect(canPair(bjorna, cecily)).toBe(true);
    expect(canPair(wilson, background)).toBe(true);
    expect(canPair(background, wilson)).toBe(true);
    expect(canPair(clara, doctor)).toBe(true);
  });

  it("rejects illegal pairs", () => {
    expect(canPair(thrasios, bjorna)).toBe(false); // plain Partner + Partner—Friends forever
    expect(canPair(bjorna, abby)).toBe(false); // different Partner— groups
    expect(canPair(pir, proudMentor)).toBe(false); // wrong "partner with" names
    expect(canPair(pir, thrasios)).toBe(false); // Partner with X + plain Partner
    expect(canPair(wilson, thrasios)).toBe(false);
    expect(canPair(background, background)).toBe(false);
    expect(canPair(azula, thrasios)).toBe(false);
  });
});

describe("partnerQuery", () => {
  it("builds Scryfall filters for the second commander", () => {
    expect(partnerQuery({ kind: "choose-background" })).toBe("t:background");
    expect(partnerQuery({ kind: "partner-with", name: "Toothy, Imaginary Friend" })).toBe(
      '!"Toothy, Imaginary Friend"',
    );
    expect(partnerQuery({ kind: "partner-group", group: "Friends forever" })).toBe(
      'is:commander o:"partner—Friends forever"',
    );
    expect(partnerQuery({ kind: "partner" })).toBe('is:commander keyword:partner -o:"partner with" -o:"partner—"');
  });
});

describe("rules-text parsing", () => {
  it("reads the Partner with name", () => {
    expect(parsePartnerWith("Partner with Toothy, Imaginary Friend (When this creature enters…)")).toBe(
      "Toothy, Imaginary Friend",
    );
    expect(parsePartnerWith("Flying\nPartner with Impetuous Protege\nOther text")).toBe("Impetuous Protege");
    expect(parsePartnerWith("Partner (You can have two commanders…)")).toBeNull();
    expect(parsePartnerWith(null)).toBeNull();
  });

  it("reads the Partner— group", () => {
    expect(parsePartnerGroup("Partner—Friends forever (You can have two commanders if both have this ability.)")).toBe(
      "Friends forever",
    );
    expect(parsePartnerGroup("Goad\nPartner—Survivors")).toBe("Survivors");
    expect(parsePartnerGroup("Partner with Toothy, Imaginary Friend")).toBeNull();
    expect(parsePartnerGroup("Partner (You can have two commanders…)")).toBeNull();
  });
});
