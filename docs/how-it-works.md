# How It Works

The XRPL Trading Bot is designed to make intelligent market-making decisions on the XRP Ledger, while keeping users informed of its activities via Discord. It efficiently manages wallets, processes market data in real time, and executes transactions through continuous communication with the network.

## 🔄 Workflow

1. **Initialization**
  
   The bot loads the configuration from `config.json`, and prepares to interact with the XRP Ledger and Discord.

2. **Connecting to the XRP Ledger**

   The bot establishes a connection to the XRP Ledger and subscribes to relevant streams, monitoring the synchronization of the server.

3. **Once the server is synchronised**

   The bot sets up the issuers, wallets, and market configurations based on the provided settings. The trading process begins.

4. **Monitor and Process Transactions**

   The bot continuously listens for incoming transactions. It updates its internal data, allowing it to adjust market positions dynamically.

5. **Sync Loss Recovery**

   In case of a loss of synchronization, the bot resets and starts the process over, ensuring reconnection to the network.
