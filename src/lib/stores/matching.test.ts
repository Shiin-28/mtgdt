import { describe, expect, it } from "vitest";
import {
  isNonSingle,
  parseCondition,
  parseFoil,
  slugMatchesCard,
  titleBaseName,
  titleMatchesCard,
} from "./matching";

describe("parseCondition", () => {
  it.each([
    ["Near Mint", "NM"],
    ["NM", "NM"],
    ["Near Mint / Pool", "NM"],
    ["Condition: NM", "NM"],
    ["Lightly Played", "LP"],
    ["LP Foil", "LP"],
    ["Slightly Played", "LP"],
    ["Moderately Played", "MP"],
    ["MP", "MP"],
    ["Heavily Played", "HP"],
    ["hp", "HP"],
    ["Damaged", "DMG"],
    ["DMG", "DMG"],
    ["", "UNKNOWN"],
    [null, "UNKNOWN"],
    ["English", "UNKNOWN"],
  ] as const)("%s -> %s", (text, want) => {
    expect(parseCondition(text)).toBe(want);
  });

  it("doesn't read condition letters inside other words", () => {
    expect(parseCondition("Champion")).toBe("UNKNOWN");
    expect(parseCondition("Help")).toBe("UNKNOWN");
  });
});

describe("parseFoil", () => {
  it.each([
    ["Sol Ring (PLG22) #1 [EN/F]", true],
    ["Sol Ring (TLE) #316 [EN/N]", false],
    ["Sol Ring Surge – Surge Foil", true],
    ["Starfleet Academy – Foil – [TRK]", true],
    ["Sol Ring – Marvel Super Heroes Commander (SurgeFoil - universesbeyond)", true],
    ["FOIL", true],
    ["NONFOIL", false],
    ["Non-Foil", false],
    ["Non Foil", false],
    ["Etched", true],
    ["Sol Ring", false],
    ["", false],
  ] as const)("%s -> %s", (text, want) => {
    expect(parseFoil(text)).toBe(want);
  });
});

describe("isNonSingle", () => {
  it("flags sleeves, boosters, playmats, tokens and art cards", () => {
    expect(isNonSingle("Dragon Shield Matte Sleeves - Yellow (100-Pack)", "Sol Ring")).toBe(true);
    expect(isNonSingle("Foundations Play Booster Box", "Counterspell")).toBe(true);
    expect(isNonSingle("Lightning Bolt Playmat", "Lightning Bolt")).toBe(true);
    expect(isNonSingle("Insectile Aberration Token", "Delver of Secrets")).toBe(true);
    expect(isNonSingle("Sol Ring Art Card", "Sol Ring")).toBe(true);
  });

  it("keeps real singles, including ones whose names contain a flagged word", () => {
    expect(isNonSingle("Sol Ring (MSC) #213 [EN/N]", "Sol Ring")).toBe(false);
    expect(isNonSingle("Booster Tutor", "Booster Tutor")).toBe(false);
    expect(isNonSingle("Pack Rat", "Pack Rat")).toBe(false);
  });
});

describe("titleBaseName", () => {
  it("cuts set names, brackets, collector numbers and HTML", () => {
    expect(titleBaseName("Sol Ring &#8211; Commander 2018 []")).toBe("Sol Ring");
    expect(titleBaseName("Sol Ring (MSC) #213 [EN/N]")).toBe("Sol Ring");
    expect(titleBaseName('Sol Ring<br /><span class="collector-number">Collector No. 21</span>')).toBe("Sol Ring");
    expect(titleBaseName("Starfleet Academy – Foil – [TRK]")).toBe("Starfleet Academy");
  });
});

describe("titleMatchesCard", () => {
  it("matches across case, punctuation, apostrophes and accents", () => {
    expect(titleMatchesCard("SOL RING", "Sol Ring")).toBe(true);
    expect(titleMatchesCard("Urza’s Saga (MH2) #259", "Urza's Saga")).toBe(true);
    expect(titleMatchesCard("Jotun Grunt", "Jötun Grunt")).toBe(true);
    expect(titleMatchesCard("Atraxa Praetors Voice", "Atraxa, Praetors' Voice")).toBe(true);
  });

  it("matches double-faced cards by full name or front face", () => {
    const dfc = "Delver of Secrets // Insectile Aberration";
    expect(titleMatchesCard("Delver of Secrets", dfc)).toBe(true);
    expect(titleMatchesCard("Delver of Secrets // Insectile Aberration (INR) #60", dfc)).toBe(true);
    expect(titleMatchesCard("Delver of Secrets // Insectile Aberration", "Delver of Secrets")).toBe(true);
  });

  it("tolerates variant words after the name", () => {
    expect(titleMatchesCard("Sol Ring Surge – Surge Foil", "Sol Ring")).toBe(true);
    expect(titleMatchesCard("Counterspell Borderless", "Counterspell")).toBe(true);
  });

  it("rejects different cards that share words", () => {
    expect(titleMatchesCard("Sol Talisman", "Sol Ring")).toBe(false);
    expect(titleMatchesCard("Lightning Bolt", "Lightning Helix")).toBe(false);
    expect(titleMatchesCard("Counterspell", "Mana Leak")).toBe(false);
    expect(titleMatchesCard("Arcane Signet", "Arcane Denial")).toBe(false);
    expect(titleMatchesCard("Command Tower", "Command Beacon")).toBe(false);
  });
});

describe("slugMatchesCard", () => {
  it("matches slug names with only variant words after the card name", () => {
    expect(slugMatchesCard("starfleet academy foil", "Starfleet Academy")).toBe(true);
    expect(slugMatchesCard("starfleet academy borderless foil", "Starfleet Academy")).toBe(true);
    expect(slugMatchesCard("urzas saga", "Urza's Saga")).toBe(true);
    expect(slugMatchesCard("delver of secrets", "Delver of Secrets // Insectile Aberration")).toBe(true);
  });

  it("rejects longer card names that start with the searched name", () => {
    expect(slugMatchesCard("sol ring of power", "Sol Ring")).toBe(false);
    expect(slugMatchesCard("lightning bolt", "Lightning")).toBe(false);
  });
});
