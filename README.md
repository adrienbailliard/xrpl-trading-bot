# XRPL Trading Bot

A powerful market maker bot for the XRP Ledger DEX.

## What You Get

When you run this bot, you will get: 
+ **Automated Trading** - Offers are placed automatically to exploit market spreads.
+ **High Performance** - Optimized for speed, anticipating offers before validation.
+ **Discord Integration** - Easily monitor the bot’s activity and performance.

This enables optimal trading performance on the XRP Ledger, providing liquidity, and maximizing trading opportunities.

## Installation

1. Install your private `rippled` server:
[Rippled Installation Guide](https://xrpl.org/docs/infrastructure/installation).

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

Before running the bot, rename `config.example.json` to `config.json` and modify it to suit your needs.

For a full explanation of all parameters, see the [Configuration Guide](docs/config.md).

## 💻 Usage

To run the project, use:
```sh
node dist/index
```

## 📜 Documentation

+ [How It Works](docs/how-it-works.md) - Overview of how the bot operates.  
+ [Project Architecture](docs/architecture.md) - Explanation of the roles of the different classes.  
+ [Configuration Guide](docs/config.md) - Details on `config.json` parameters.

Refer to these documents to understand the project and configure it according to your needs.
