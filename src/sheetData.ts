import { google, sheets_v4 } from "googleapis";
import { Item } from "./commons";

type SheetValue = string | number;

type TargetSheet = {
  sheetId: number;
  rowCount: number;
};

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

    if (typeof item.title !== "string" || !item.title.trim()) {
      throw new Error(`Missing title at rank ${item.rank}`);
    }
    if (typeof item.titleJapanese !== "string") {
      throw new Error(`Invalid Japanese title at rank ${item.rank}`);
    }
    if (typeof item.year !== "string" || !item.year.trim()) {
      throw new Error(`Invalid year at rank ${item.rank}`);
    }
    if (typeof item.url !== "string" || !item.url.startsWith("https://boardgamegeek.com/boardgame/")) {
      throw new Error(`Invalid BGG URL at rank ${item.rank}: ${item.url}`);
    }
    if (!Number.isFinite(item.score) || !Number.isFinite(item.weight)) {
      throw new Error(`Invalid numeric data at rank ${item.rank}`);
    }
    if (!Array.isArray(item.bestPlayers) || !Array.isArray(item.designers)) {
      throw new Error(`Invalid list data at rank ${item.rank}`);
    }
    if (item.bestPlayers.length === 0 || !item.bestPlayers.every((player) => Number.isInteger(player) && player > 0)) {
      throw new Error(`Invalid best-player data at rank ${item.rank}`);
    }
    if (
      item.designers.length === 0 ||
      !item.designers.every((designer) => typeof designer === "string" && designer.trim().length > 0)
    ) {
      throw new Error(`Invalid designer data at rank ${item.rank}`);
    }
  }

  for (let expectedRank = 1; expectedRank <= items.length; expectedRank += 1) {
    if (!ranks.has(expectedRank)) {
      throw new Error(`Missing rank: ${expectedRank}`);
    }
  }
};

export const assertDistinctSheetNames = (dataSheetName: string, metadataSheetName: string): void => {
  if (dataSheetName === metadataSheetName) {
    throw new Error("DATA_SHEET_NAME and METADATA_SHEET_NAME must be different");
  }
};

const ensureSheetsExist = async (
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetNames: string[],
): Promise<Map<string, TargetSheet>> => {
  const getTargetSheets = async (): Promise<Map<string, TargetSheet>> => {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties(sheetId,title,gridProperties.rowCount)",
    });
    const targets = new Map<string, TargetSheet>();

    for (const sheet of spreadsheet.data.sheets ?? []) {
      const properties = sheet.properties;
      if (
        typeof properties?.title === "string" &&
        typeof properties.sheetId === "number" &&
        typeof properties.gridProperties?.rowCount === "number"
      ) {
        targets.set(properties.title, {
          sheetId: properties.sheetId,
          rowCount: properties.gridProperties.rowCount,
        });
      }
    }

    return targets;
  };

  let targetSheets = await getTargetSheets();
  const missingSheetNames = sheetNames.filter((sheetName) => !targetSheets.has(sheetName));

  if (missingSheetNames.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missingSheetNames.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
    targetSheets = await getTargetSheets();
  }

  for (const sheetName of sheetNames) {
    if (!targetSheets.has(sheetName)) {
      throw new Error(`Failed to resolve sheet properties: ${sheetName}`);
    }
  }

  return targetSheets;
};

const toRowData = (row: SheetValue[]): sheets_v4.Schema$RowData => ({
  values: row.map((value) => ({
    userEnteredValue: typeof value === "number" ? { numberValue: value } : { stringValue: value },
  })),
});

export const createSheetUpdateRequests = (
  rows: SheetValue[][],
  itemCount: number,
  updatedAt: string,
  dataSheet: TargetSheet,
  metadataSheet: TargetSheet,
): sheets_v4.Schema$Request[] => {
  const metadataRows: SheetValue[][] = [
    ["key", "value"],
    ["lastUpdatedAt", updatedAt],
    ["itemCount", itemCount],
    ["source", "BoardGameGeek"],
    ["schemaVersion", 1],
  ];
  const requests: sheets_v4.Schema$Request[] = [];

  if (rows.length > dataSheet.rowCount) {
    requests.push({
      appendDimension: {
        sheetId: dataSheet.sheetId,
        dimension: "ROWS",
        length: rows.length - dataSheet.rowCount,
      },
    });
  }
  if (metadataRows.length > metadataSheet.rowCount) {
    requests.push({
      appendDimension: {
        sheetId: metadataSheet.sheetId,
        dimension: "ROWS",
        length: metadataRows.length - metadataSheet.rowCount,
      },
    });
  }

  requests.push(
    {
      updateCells: {
        range: {
          sheetId: dataSheet.sheetId,
          startRowIndex: 0,
          endRowIndex: Math.max(dataSheet.rowCount, rows.length),
          startColumnIndex: 0,
          endColumnIndex: DATA_COLUMNS.length,
        },
        rows: rows.map(toRowData),
        fields: "userEnteredValue",
      },
    },
    {
      updateCells: {
        range: {
          sheetId: metadataSheet.sheetId,
          startRowIndex: 0,
          endRowIndex: Math.max(metadataSheet.rowCount, metadataRows.length),
          startColumnIndex: 0,
          endColumnIndex: 2,
        },
        rows: metadataRows.map(toRowData),
        fields: "userEnteredValue",
      },
    },
  );

  return requests;
};

export const replaceSheetData = async (items: Item[], now: Date = new Date()): Promise<SheetUpdateResult> => {
  const spreadsheetId = getRequiredEnvironmentVariable("SPREADSHEET_ID");
  const dataSheetName = process.env.DATA_SHEET_NAME?.trim() || "data";
  const metadataSheetName = process.env.METADATA_SHEET_NAME?.trim() || "metadata";
  const minimumItemCount = getMinimumItemCount();
  const updatedAt = now.toISOString();

  assertDistinctSheetNames(dataSheetName, metadataSheetName);
  assertValidItems(items, minimumItemCount);

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const rows = createSheetRows(items);
  const targetSheets = await ensureSheetsExist(sheets, spreadsheetId, [dataSheetName, metadataSheetName]);
  const dataSheet = targetSheets.get(dataSheetName);
  const metadataSheet = targetSheets.get(metadataSheetName);
  if (!dataSheet || !metadataSheet) {
    throw new Error("Failed to resolve target sheets");
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: createSheetUpdateRequests(rows, items.length, updatedAt, dataSheet, metadataSheet),
    },
  });

  return {
    spreadsheetId,
    dataSheetName,
    itemCount: items.length,
    updatedAt,
  };
};
