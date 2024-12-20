import puppeteer, { Browser, Page } from "puppeteer";
import { Item } from "./commons";
import { scrapeBoardGameDetails, scrapeBoardGameList } from "./scrapingBGGHelper";

const initializeBrowser = async (): Promise<{ browser: Browser; page: Page }> => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  return { browser, page };
};
export const scrapingBGG = async (): Promise<Item[]> => {
  const { browser, page } = await initializeBrowser();
  try {
    // ボードゲーム一覧の取得
    const allItems = await scrapeBoardGameList(page);
    // 各ゲームの詳細情報を取得
    for (const [index, item] of allItems.entries()) {
      if (item.url) {
        allItems[index] = await scrapeBoardGameDetails(page, item);
      }
    }
    console.table(allItems);
    return allItems;
  } finally {
    await browser.close();
  }
};
