import { google, sheets_v4 } from "googleapis";
import { Item } from "./commons";

type SheetValue = string | number;

const DATA_COLUMNS = [
  "rank",
  "title",
  "titleJapanese",
  "year",
  "score",
  "weight",
  "bestPlayers",
  "designers",
  "url",
] as const satisfies ReadonlyArray<keyof Item>;

export type SheetUpdateResult = {
  spreadsheetId: string;
  dataSheetName: string;
  itemCount: number;
  updatedAt: string;
};

const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
};

const getMinimumItemCount = (): number => {
  const value = Number(process.env.MIN_ITEM_COUNT ?? "450");
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("MIN_ITEM_COUNT must be a positive integer");
  }
  return value;
};

const quoteSheetName = (sheetName: string): string => `'${sheetName.replace(/'/g, "''")}'`;

const itemValueToSheetValue = (value: Item[keyof Item]): SheetValue => {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  return value;
};

export const createSheetRows = (items: Item[]): SheetValue[][] => [
  [...DATA_COLUMNS],
  ...items.map((item) => DATA_COLUMNS.map((column) => itemValueToSheetValue(item[column]))),
];

export const assertValidItems = (items: Item[], minimumItemCount: number): void => {
  if (items.length < minimumItemCount) {
    throw new Error(`Scraped item count ${items.length} is below the minimum ${minimumItemCount}`);
  }

  const ranks = new Set<number>();
  for (const item of items) {
    if (!Number.isInteger(item.rank) || item.rank < 1) {
      throw new Error(`Invalid rank: ${item.rank}`);
    }
    if (ranks.has(item.rank)) {
      throw new Error(`Duplicate rank: ${item.rank}`);
    }
    ranks.add(item.rank);

    if (!item.title.trim()) {
      throw new Error(`Missing title at rank ${item.rank}`);
    }
    if (!item.url.startsWith("https://boardgamegeek.com/boardgame/")) {
      throw new Error(`Invalid BGG URL at rank ${item.rank}: ${item.url}`);
    }
    if (!Number.isFinite(item.score) || !Number.isFinite(item.weight)) {
      throw new Error(`Invalid numeric data at rank ${item.rank}`);
    }
    if (!Array.isArray(item.bestPlayers) || !Array.isArray(item.designers)) {
      throw new Error(`Invalid list data at rank ${item.rank}`);
    }
  }
};

const ensureSheetsExist = async (
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetNames: string[],
): Promise<void> => {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const existingSheetNames = new Set(
    spreadsheet.data.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)) ?? [],
  );
  const missingSheetNames = sheetNames.filter((sheetName) => !existingSheetNames.has(sheetName));

  if (missingSheetNames.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missingSheetNames.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
  }
};

export const replaceSheetData = async (items: Item[], now: Date = new Date()): Promise<SheetUpdateResult> => {
  const spreadsheetId = getRequiredEnvironmentVariable("SPREADSHEET_ID");
  const dataSheetName = process.env.DATA_SHEET_NAME?.trim() || "data";
  const metadataSheetName = process.env.METADATA_SHEET_NAME?.trim() || "metadata";
  const minimumItemCount = getMinimumItemCount();
  const updatedAt = now.toISOString();

  assertValidItems(items, minimumItemCount);

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  await ensureSheetsExist(sheets, spreadsheetId, [dataSheetName, metadataSheetName]);

  const rows = createSheetRows(items);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: `${quoteSheetName(dataSheetName)}!A1`,
          majorDimension: "ROWS",
          values: rows,
        },
        {
          range: `${quoteSheetName(metadataSheetName)}!A1`,
          majorDimension: "ROWS",
          values: [
            ["key", "value"],
            ["lastUpdatedAt", updatedAt],
            ["itemCount", items.length],
            ["source", "BoardGameGeek"],
            ["schemaVersion", 1],
          ],
        },
      ],
    },
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quoteSheetName(dataSheetName)}!A${rows.length + 1}:I`,
  });

  return {
    spreadsheetId,
    dataSheetName,
    itemCount: items.length,
    updatedAt,
  };
};
