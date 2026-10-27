import { describe, expect, it } from "vitest";
import { tcgphList, tcgphSearchUrl } from "./tcgph";

describe("tcgph", () => {
  it("formats a pasteable list, front face only for double-faced cards", () => {
    expect(
      tcgphList([
        { name: "Sol Ring", qty: 1 },
        { name: "Mountain", qty: 8 },
        { name: "Waterlogged Teachings // Inundated Archive", qty: 1 },
      ]),
    ).toBe("1 Sol Ring\n8 Mountain\n1 Waterlogged Teachings");
  });

  it("builds a search link", () => {
    expect(tcgphSearchUrl("Jeska's Will")).toBe("https://tcgph.com/search?q=Jeska's%20Will");
    expect(tcgphSearchUrl("Delver of Secrets // Insectile Aberration")).toBe(
      "https://tcgph.com/search?q=Delver%20of%20Secrets",
    );
  });
});
