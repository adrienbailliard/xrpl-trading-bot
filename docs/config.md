# 📝 Configuration Guide

This document explains the settings available in the `config.json` file and how to configure them properly.

## General Settings

+ `displayNDigits` (number)
  
  Number of decimal places used for displaying values.
+ `ignoreOfferAmountBalanceRatio` (number)
  
  Percentage of the balance to ignore when considering offers.
+ `baseProfitSpread` (number)
  
  Minimum profit margin percentage applied when placing offers.
+ `benchmarkAveragingPeriod` (number)
  
  Number of minutes over which the benchmark price is averaged.
+ `reserveAddress` (string)
  
  XRP Ledger address where excess tokens are sent.

## Spread Management (`spreadAverageRatio`)

+ `minSpread` (number)

  Minimum spread percentage required before the bot considers an offer.
+ `tradeTrigger` (number)

   Spread percentage that triggers trade execution.
+ `smallOffersTolerance` (number)

  Spread tolerance percentage for small offers that would normally be ignored.

## Discord Integration (`discord`)

+ `monitoringChannel` (string)

  Name of the Discord channel where the bot sends synchronization status updates.
+ `token` (string)

  Your Discord bot token. For more information, see [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2).
+ `confirmationColor` (string)

  Hexadecimal color used for confirmation messages.
+ `errorColor` (string)

  Hexadecimal color used for error messages.

## 💰 Wallet Configuration (`wallets`)

Each wallet is identified by a secret seed and is associated with a specific market. You can add as many wallets as needed, each tied to a different market.

They contain the following settings:
+ `base` (object)

  Base currency in the XRP Ledger. For more information, see [XRP Ledger Currency Formats](https://xrpl.org/docs/references/protocol/data-types/currency-formats#specifying-without-amounts).
+ `quote` (object)

  Quote currency in the XRP Ledger. For more information, see [XRP Ledger Currency Formats](https://xrpl.org/docs/references/protocol/data-types/currency-formats#specifying-without-amounts).
+ `exposureLimit` (number)

  Maximum amount of the quote currency that can be used.
