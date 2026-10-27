import { describe, expect, it } from "vitest";
import { parseDecklist } from "./parse";

const SAMPLE = `1 Sol Ring
1 Arcane Signet
1 Command Tower
1 Lightning Bolt
1 Counterspell
1 Delver of Secrets // Insectile Aberration`;

describe("parseDecklist", () => {
  it("parses the sample list", () => {
    const { entries } = parseDecklist(SAMPLE);
    expect(entries.map((e) => [e.quantity, e.name])).toEqual([
      [1, "Sol Ring"],
      [1, "Arcane Signet"],
      [1, "Command Tower"],
      [1, "Lightning Bolt"],
      [1, "Counterspell"],
      [1, "Delver of Secrets // Insectile Aberration"],
    ]);
  });

  it("accepts plain names and 1x counts", () => {
    const { entries } = parseDecklist("Sol Ring\n2x Island\n10 Forest");
    expect(entries.map((e) => [e.quantity, e.name])).toEqual([
      [1, "Sol Ring"],
      [2, "Island"],
      [10, "Forest"],
    ]);
  });

  it("reads Moxfield / ManaBox set codes, collector numbers and foil tags", () => {
    const { entries } = parseDecklist(
      "1 Sol Ring (C21) 263\n1 Arcane Signet (CMM) 937 *F*\n1 Command Tower (PLST) C21-284",
    );
    expect(entries).toEqual([
      { name: "Sol Ring", quantity: 1, setCode: "c21", collectorNumber: "263", isCommander: false },
      { name: "Arcane Signet", quantity: 1, setCode: "cmm", collectorNumber: "937", isCommander: false },
      { name: "Command Tower", quantity: 1, setCode: "plst", collectorNumber: "C21-284", isCommander: false },
    ]);
  });

  it("accepts a set code without a collector number", () => {
    expect(parseDecklist("1 Counterspell (MH2)").entries[0]).toMatchObject({
      name: "Counterspell",
      setCode: "mh2",
      collectorNumber: undefined,
    });
  });

  it("skips section headers and flags commanders", () => {
    const parsed = parseDecklist(
      "Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\nSIDEBOARD:\n1 Lightning Bolt\nCreatures (30)\n1 Delver of Secrets",
    );
    expect(parsed.headers).toEqual(["Commander", "Deck", "SIDEBOARD:", "Creatures (30)"]);
    expect(parsed.entries.map((e) => [e.name, e.isCommander])).toEqual([
      ["Atraxa, Praetors' Voice", true],
      ["Sol Ring", false],
      ["Lightning Bolt", false],
      ["Delver of Secrets", false],
    ]);
  });

  it("flags *CMDR* tags and strips Archidekt categories and Moxfield tags", () => {
    const { entries } = parseDecklist(
      "1x Atraxa, Praetors' Voice (2X2) 190 *CMDR*\n1x Sol Ring (C21) 263 [Ramp]\n1 Arcane Signet #ramp #rocks",
    );
    expect(entries.map((e) => [e.name, e.setCode, e.collectorNumber, e.isCommander])).toEqual([
      ["Atraxa, Praetors' Voice", "2x2", "190", true],
      ["Sol Ring", "c21", "263", false],
      ["Arcane Signet", undefined, undefined, false],
    ]);
  });

  it("merges duplicate lines regardless of case or punctuation", () => {
    const parsed = parseDecklist("1 Sol Ring\n1 sol ring\n2 Urza's Saga\n1 Urza’s Saga\nSB: 1 Sol Ring");
    expect(parsed.entries.map((e) => [e.quantity, e.name])).toEqual([
      [3, "Sol Ring"],
      [3, "Urza's Saga"],
    ]);
    expect(parsed.mergedLines).toBe(3);
  });

  it("ignores blank lines, comments and zero counts", () => {
    const { entries } = parseDecklist("\n// my list\n# notes\n0 Island\n   \n1 Sol Ring\r\n");
    expect(entries.map((e) => e.name)).toEqual(["Sol Ring"]);
  });
});
