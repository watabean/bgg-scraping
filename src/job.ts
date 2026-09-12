import { scrapingBGG } from "./scrapingBGG";
import { replaceSheetData } from "./sheetData";

const refreshBggSheet = async (): Promise<void> => {
  console.log("Starting BGG sheet refresh...");
  const items = await scrapingBGG();
  const result = await replaceSheetData(items);
  console.log(`BGG sheet refresh completed: ${result.itemCount} items at ${result.updatedAt}`);
};

refreshBggSheet().catch((error: unknown) => {
  console.error("BGG sheet refresh failed:", error);
  process.exitCode = 1;
});
