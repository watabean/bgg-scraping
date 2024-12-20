import { exportData, Item } from "./commons";
import { scrapingBGG } from "./scrapingBGG";

(async () => {
  try {
    console.log("Starting board games scraping...");
    const data = await scrapingBGG();
    exportData(
      ["rank", "title", "titleJapanese", "year", "score", "weight", "bestPlayers", "designers", "url"] as Array<
        keyof Item
      >,
      data,
    );
    console.log("Scraping completed successfully");
  } catch (error) {
    console.error("Error occurred while scraping:", error);
  }
})();
