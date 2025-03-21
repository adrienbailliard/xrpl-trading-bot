# XRPL Trading Bot

A powerful market maker bot for the XRP Ledger DEX.

## What You Get

When you run this bot, you will get: 
+ **Automated Trading** - buy and sell offers are automatically placed.
+ **High Performance** - optimized for speed, anticipating offers before validation.
+ **Discord Integration** - easily monitor the bot’s activity and performance.

This enables optimal trading performance on the XRP Ledger, providing liquidity, and maximizing trading opportunities.

## Installation

1. Install and run your private `rippled` server:
[Rippled Installation Guide](https://xrpl.org/docs/infrastructure/installation)

2. Clone the repository:
```sh
git clone https://github.com/adrienbailliard/xrpl-trading-bot.git
```

3. Navigate to the project folder:
```sh
cd xrpl-trading-bot
```

4. Install dependencies:
```sh
npm i
```

5. Compile TypeScript:
```sh
npx tsc
```

## Configuration

Before running the bot, you must customize its behavior by modifying the `config.json` file.
For a full explanation of all parameters, see the [Configuration Guide](docs/config.md).

## 💻 Usage

To run the project, use:
```sh
node dist/index
```

## Documentation

+ **How It Works** - [docs/architecture.md](docs/how-it-works.md).
+ **Project Architecture** - [docs/architecture.md](docs/architecture.md).
+ **Configuration Guide** - [docs/config.md](docs/config.md).
