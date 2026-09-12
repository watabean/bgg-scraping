import assert from "node:assert/strict";
import test from "node:test";
import { Item } from "./commons";
import { assertDistinctSheetNames, assertValidItems, createSheetRows, createSheetUpdateRequests } from "./sheetData";

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
  assert.throws(() => assertValidItems([createItem({ title: undefined as unknown as string })], 1), /Missing title/);
  assert.throws(() => assertValidItems([createItem({ url: undefined as unknown as string })], 1), /Invalid BGG URL/);
  assert.throws(() => assertValidItems([createItem({ year: undefined as unknown as string })], 1), /Invalid year/);
  assert.throws(
    () => assertValidItems([createItem({ titleJapanese: undefined as unknown as string })], 1),
    /Invalid Japanese title/,
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

test("createSheetUpdateRequests publishes data and metadata in one batch", () => {
  const rows = createSheetRows([createItem()]);
  const requests = createSheetUpdateRequests(
    rows,
    1,
    "2026-09-12T00:00:00.000Z",
    { sheetId: 10, rowCount: 100 },
    { sheetId: 20, rowCount: 100 },
  );

  assert.equal(requests.length, 2);
  assert.equal(requests[0].updateCells?.range?.sheetId, 10);
  assert.equal(requests[0].updateCells?.range?.endRowIndex, 100);
  assert.equal(requests[0].updateCells?.rows?.length, 2);
  assert.equal(requests[1].updateCells?.range?.sheetId, 20);
  assert.equal(
    requests[1].updateCells?.rows?.[1].values?.[1].userEnteredValue?.stringValue,
    "2026-09-12T00:00:00.000Z",
  );
});
