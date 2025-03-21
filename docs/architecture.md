# 📂 Project Architecture

This document explains the roles of the different classes in the XRPL Trading Bot.

## Entry Point

`index.ts`

This is the entry point of the XRPL Trading Bot.
It:
+ Initializes all core components
+ Listens for network events
+ Processes transactions both before and after they are validated

## ⚙️ Core Components

`Node.ts`

This class manages the connection.
It:
+ Communicates with the XRP Ledger
+ Subscribes to relevant streams
+ Monitors the server synchronization

`Wallet.ts`

This class represents a wallet.
It:
+ Retrieve wallet information
+ Monitors and updates balances
+ Manages offers
+ Executes trades

`Market.ts`

This class represents a market.
It:
+ Calculates and updates key market data
+ Tracks XRP Ledger wallet balances
+ Ignores invalid offers
+ Generates trading signals

`Issuer.ts`

This class represents an issuer wallet.
It:
+ Retrieves and updates the tick size and transfer rate
+ Emits events when issuer parameters change

`Book.ts`

This class represents a market book.
It:
+ Sorts offers by quality
+ Adds and deletes offers

## 🛠️ Utilities

`Manager.ts`

This class manages a collection of items.
It:
+ Adds items
+ Retrieves items by ID
+ Destroys all items

`EventEmitter.ts`

This class manages event-driven communication.
It:
+ Registers event listeners
+ Emits events
+ Handles errors during event emission

`CircularBuffer.ts`

This class implements a circular buffer.
It:
+ Stores and overwrites elements
+ Provides access to the oldest elements

## 🔌 External Integration

`DiscordBot.ts`

This class manages a Discord bot.
It:
+ Processes interactions
+ Protects and monitors specific channels
+ Logs messages
