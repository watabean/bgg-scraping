import { Page } from "puppeteer";
import { Item } from "./commons";

/**
 * ボードゲーム一覧のスクレイピング
 * @param page
 * @returns
 */
export const scrapeBoardGameList = async (page: Page): Promise<Item[]> => {
  // Note: 未ログインだと20ページしか参照できない
  const MAX_PAGE = 5;
  const allItems: Item[] = [];
  for (let i = 1; i <= MAX_PAGE; i++) {
    const url = `https://boardgamegeek.com/browse/boardgame/page/${i}`;
    console.log(`Fetching ranking data from ${url}`);
    await page.goto(url);
    await page.waitForSelector(`#results_objectname1`);
    const pageItems = await page.evaluate(() =>
      [...document.querySelectorAll("#row_")].map(
        (el, j) =>
          ({
            rank: Number(el.querySelector<HTMLElement>(".collection_rank")?.innerText),
            title: el.querySelector<HTMLElement>(`#results_objectname${j + 1} > a`)?.innerText,
            year: el.querySelector<HTMLElement>(`#results_objectname${j + 1} > span`)?.innerText.replace(/[()]/g, ""),
            score: Number(el.querySelector<HTMLElement>(".collection_bggrating")?.innerText),
            url: el.querySelector<HTMLAnchorElement>(".primary")?.href,
          }) as Item,
      ),
    );
    allItems.push(...pageItems);
  }
  return allItems;
};

/**
 * ボードゲーム詳細情報の取得
 * @param page
 * @param item
 * @returns
 */
export const scrapeBoardGameDetails = async (page: Page, item: Item): Promise<Item> => {
  console.log(`Fetching details for: ${item.rank} ${item.title}`);
  await page.goto(item.url);
  await page.waitForSelector("[class*=gameplay-weight]");
  item.weight = await page.evaluate((): number =>
    Number(document.querySelector<HTMLElement>("[class*=gameplay-weight]")?.innerText),
  );
  item.designers = await page.evaluate((): string[] =>
    [...document.querySelectorAll<HTMLInputElement>("popup-list > span[itemprop='creator'] > a")].map(
      (el) => el?.innerText,
    ),
  );
  item.bestPlayers = await page.evaluate((): number[] => {
    const playersText = document.querySelector<HTMLElement>(".gameplay-item-secondary button")?.innerText;
    const match = playersText?.match(/Best: (.+)$/);
    return match ? match[1].split(/[,–]/).map(Number) : [];
  });
  await page.goto(`${item.url}/versions?pageid=1&language=2194`);
  await page.waitForSelector(".summary");
  item.titleJapanese = await page.evaluate(
    (): string =>
      [...document.querySelectorAll<HTMLInputElement>(".summary-item-section > ul > li")]
        .filter((li) => li.innerText.includes("Japanese"))
        .map((li) => {
          const titleElement = li.closest(".summary-item")?.querySelector(".summary-item-title > a");
          return titleElement?.childNodes[0]?.textContent?.trim() ?? "";
        })
        .filter((str) => /[\u3040-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F]/.test(str))
        .sort((a, b) => b.length - a.length)
        .pop() ?? "",
  );
  return item;
};
