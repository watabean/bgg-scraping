import assert from "node:assert/strict";
import test from "node:test";
import { Item } from "./commons";
import { assertValidItems, createSheetRows } from "./sheetData";

const createItem = (overrides: Partial<Item> = {}): Item => ({
  keyword: "",
  rank: 1,
  title: "Brass: Birmingham",
  price: "",
  retailPrice: "",
  discount: "",
  titleJapanese: "ブラス：バーミンガム",
  year: "2018",
  score: 8.4,
  weight: 3.87,
  votes: 0,
  bestPlayers: [3, 4],
  designers: ["Gavan Brown", "Matt Tolman", "Martin Wallace"],
  url: "https://boardgamegeek.com/boardgame/224517/brass-birmingham",
  ...overrides,
});

test("createSheetRows creates the schema consumed by bgg-explorer", () => {
  assert.deepEqual(createSheetRows([createItem()]), [
    ["rank", "title", "titleJapanese", "year", "score", "weight", "bestPlayers", "designers", "url"],
    [
      1,
      "Brass: Birmingham",
      "ブラス：バーミンガム",
      "2018",
      8.4,
      3.87,
      "3,4",
      "Gavan Brown,Matt Tolman,Martin Wallace",
      "https://boardgamegeek.com/boardgame/224517/brass-birmingham",
    ],
  ]);
});

test("assertValidItems rejects a partial scrape", () => {
  assert.throws(() => assertValidItems([createItem()], 2), /below the minimum/);
});

test("assertValidItems rejects duplicate ranks", () => {
  assert.throws(() => assertValidItems([createItem(), createItem()], 2), /Duplicate rank/);
});

test("assertValidItems accepts valid unique items", () => {
  assert.doesNotThrow(() => assertValidItems([createItem(), createItem({ rank: 2, title: "Ark Nova" })], 2));
});
