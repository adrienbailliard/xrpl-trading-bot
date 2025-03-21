# XRPL Trading Bot

A powerful market maker bot for the XRP Ledger DEX.

## What You Get

When you run this bot, you will get: 
+ **Automated Trading** - buy and sell offers are automatically placed.
+ **High Performance** - optimized for speed, anticipating offers before validation.
+ **Discord Integration** - easily monitor the bot’s activity and performance.

This enables optimal trading performance on the XRP Ledger, providing liquidity, and maximizing trading opportunities.

## Installation

1. Clone the repository:
```sh
git clone https://github.com/adrienbailliard/xrpl-trading-bot.git
```

2. Navigate to the project folder:
```sh
cd xrpl-trading-bot
```

3. Install dependencies:
```sh
npm i
```

4. Compile TypeScript:
```sh
npx tsc
```

## Configuration

Before running the script, you can customize its behavior by modifying the `config.json` file:
+ `interval` - number of days for fetching trading data.
+ `maxResults` - maximum number of trading pairs to display.
+ `minExchanges` - minimum number of exchanges required.
+ `minUniqueBuyersAndSellers` - minimum number of unique buyers and sellers required.

Modify these **integer** values to filter and refine the results based on your preferences.

## 💻 Usage

To run the project, use:
```sh
node dist/index
```
