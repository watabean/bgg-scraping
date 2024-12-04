import puppeteer from "puppeteer";
import { Item, exportData } from "./commons";

// Note: 未ログインだと20ページしか参照できない
const MAX_PAGE = 5;
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  const allItems: Item[] = [];
  for (let i = 1; i <= MAX_PAGE; i++) {
    await page.goto(`https://boardgamegeek.com/browse/boardgame/page/${i}`);
    await page.waitForSelector(`#results_objectname1`);
    // 1ページの全行を取得
    const pageItems = await page.evaluate((): Item[] => {
      const items: Item[] = [];
      document.querySelectorAll("#row_").forEach((el, j) => {
        const rank = Number(el.querySelector<HTMLElement>(".collection_rank")?.innerText);
        const title = el.querySelector<HTMLElement>(`#results_objectname${j + 1} > a`)?.innerText;
        const year = el
          .querySelector<HTMLElement>(`#results_objectname${j + 1} > span`)
          ?.innerText.replace(/[()]/g, "");
        const score = Number(el.querySelector<HTMLElement>(".collection_bggrating")?.innerText);
        const url = el.querySelector<HTMLAnchorElement>(".primary")?.href;
        items.push({
          rank,
          title,
          year,
          score,
          url,
        } as Item);
      });
      return items;
    });
    allItems.push(...pageItems);
  }
  for (const item of allItems) {
    if (item.url) {
      console.log(`${item.rank} ${item.title}`);
      await page.goto(item.url);
      await page.waitForSelector("[class*=gameplay-weight]");
      item.weight = await page.evaluate((): number =>
        Number(document.querySelector<HTMLElement>("[class*=gameplay-weight]")?.innerText),
      );
      item.designers = await page.evaluate((): string[] =>
        Array.from(document.querySelectorAll<HTMLInputElement>("popup-list > span[itemprop='creator'] > a")).map(
          (el) => el?.innerText,
        ),
      );
      console.log(`designers: ${item.designers}`);
      item.bestPlayers = await page.evaluate((): number[] => {
        const playersText = document.querySelector<HTMLElement>(".gameplay-item-secondary button")?.innerText;
        const match = playersText?.match(/Best: ([^\s]+)/);
        const result = match ? match[1].split("–").map(Number) : [];
        return result;
      });
      console.log(`bestPlayers: ${item.bestPlayers}`);
      await page.goto(`${item.url}/versions?pageid=1&language=2194`); // language=2194 --> Japanese
      await page.waitForSelector(".summary");
      item.titleJapanese = await page.evaluate(
        (): string =>
          Array.from(document.querySelectorAll<HTMLInputElement>(".summary-item-section > ul > li"))
            .filter((li) => li.innerText.includes("Japanese"))
            .map((li) => {
              const titleElement = li.closest(".summary-item")?.querySelector(".summary-item-title > a");
              const japaneseTitle = titleElement?.childNodes[0]?.textContent?.trim() ?? ""; // 最初のテキストノードを取得
              return japaneseTitle;
            })
            .filter((str) => {
              const containsJapanese = (str: string) => {
                // 日本語のUnicode範囲を含む正規表現
                const japaneseRegex = /[\u3040-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F]/;
                return japaneseRegex.test(str);
              };
              return containsJapanese(str);
            })
            .sort((a, b) => b.length - a.length) // 降順
            .pop() ?? "",
      );
      console.log(`Japanese: ${item.titleJapanese}`);
    }
  }
  console.table(allItems);
  exportData(
    ["rank", "title", "titleJapanese", "year", "score", "weight", "bestPlayers", "designers", "url"] as Array<
      keyof Item
    >,
    allItems,
  );
  browser.close();
})();
