import assert from "node:assert/strict";
import test from "node:test";
import { Item } from "./commons";
import { assertDistinctSheetNames, assertValidItems, createSheetRows } from "./sheetData";

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

test("assertValidItems rejects a missing rank", () => {
  assert.throws(() => assertValidItems([createItem(), createItem({ rank: 3 })], 2), /Missing rank: 2/);
});

test("assertValidItems rejects missing runtime string values", () => {
  assert.throws(
    () => assertValidItems([createItem({ title: undefined as unknown as string })], 1),
    /Missing title/,
  );
  assert.throws(
    () => assertValidItems([createItem({ url: undefined as unknown as string })], 1),
    /Invalid BGG URL/,
  );
});

test("assertValidItems rejects empty or malformed list values", () => {
  assert.throws(() => assertValidItems([createItem({ bestPlayers: [] })], 1), /Invalid best-player data/);
  assert.throws(() => assertValidItems([createItem({ bestPlayers: [Number.NaN] })], 1), /Invalid best-player data/);
  assert.throws(() => assertValidItems([createItem({ designers: [""] })], 1), /Invalid designer data/);
});

test("assertValidItems accepts valid unique items", () => {
  assert.doesNotThrow(() => assertValidItems([createItem(), createItem({ rank: 2, title: "Ark Nova" })], 2));
});

test("assertDistinctSheetNames rejects overlapping targets", () => {
  assert.throws(() => assertDistinctSheetNames("data", "data"), /must be different/);
  assert.doesNotThrow(() => assertDistinctSheetNames("data", "metadata"));
});
