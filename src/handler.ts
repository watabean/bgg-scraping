import { scrapingBGG } from "./scrapingBGG";
import * as functions from "@google-cloud/functions-framework";

functions.http("scrapingBGG", async (_req, res) => {
  try {
    const items = await scrapingBGG();
    res.status(200).json({
      message: "Success",
      data: items,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});
