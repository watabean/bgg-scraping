import * as fs from "fs";

export type Item = {
  keyword: string;
  title: string;
  price: string;
  retailPrice: string;
  discount: string;
  rank: number;
  score: number;
  weight: number;
  url: string;
  year: string;
  votes: number;
  designers: string[];
  bestPlayers: number[];
  titleJapanese: string;
};

/**
 * @param heading ヘッダー
 * @param allItems 出力する要素
 * @param filename ファイル名
 */
export const exportData = (heading: Array<keyof Item>, allItems: Item[], filename: string = "out.csv") => {
  fs.writeFile(
    `${__dirname}/output/${filename}`,
    allItems.map((item) => heading.map((prop) => `"${item[prop]}"`).join(",")).join("\n"),
    (err) => {
      if (err) console.error(err);
    },
  );
};