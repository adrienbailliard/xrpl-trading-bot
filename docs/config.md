# 📝 Configuration Guide

This document explains the settings available in the `config.json` file and how to configure them properly.

## General Settings

+ `displayNDigits` (number)
  
  The number of decimal places used for displaying values.
+ `ignoreOfferAmountBalanceRatio` (number)
  
  The percentage of the balance to ignore when considering offers.
+ `baseProfitSpread` (number)
  
  Minimum profit margin applied when placing offers.
+ `benchmarkAveragingPeriod` (number)
  
  The number of minutes over which the benchmark price is averaged.
+ `reserveAddress` (string)
  
  XRP Ledger address where excess tokens are sent.

## Spread Management (`spreadAverageRatio`)

+ `minSpread` (number)

  Minimum spread percentage required before the bot considers an offer.
+ `tradeTrigger` (number)

   Spread percentage that triggers trade execution.
+ `smallOffersTolerance` (number)

  Tolerance for small offers that would normally be ignored.

## 🤖 Discord Integration (`discord`)

+ `monitoringChannel` (string)

  Name of the Discord channel where the bot sends synchronization status updates.
+ `token` (string)

  Your Discord bot token. For more information, visit [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2).
+ `confirmationColor` (string)

  Hexadecimal color used for confirmation messages.
+ `errorColor` (string)

  Hexadecimal color used for error messages.
