# Scraping BGG ranking data

[![npm puppeteer package](https://img.shields.io/npm/v/puppeteer.svg)](https://npmjs.org/package/puppeteer)

This project scrapes board game ranking data from [BoardGameGeek (BGG)](https://boardgamegeek.com/) and provides the following functionality:

- Export ranking data as a CSV file for analysis.
- Run a local server to simulate a cloud function for retrieving ranking data dynamically.

## Before Installation

Make sure you have [Volta](https://volta.sh/) installed.  
Volta ensures you are using the correct Node.js and npm versions for this project. Follow the instructions on their website to set it up.

## Installation

```bash
npm install
```

## Run

### 1. Export BGG Ranking Data to CSV

Run the following command to scrape the data and output it as a [CSV file](output/out.csv):

```bash
npm start
```

### 2. Setup a Local Server (Cloud Functions Simulation)

Run the following commands to set up a local server:

```bash
npm run build
npx functions-framework --target=scrapingBGG
```

You can test the server by sending a request:

```bash
curl http://localhost:8080/
```
