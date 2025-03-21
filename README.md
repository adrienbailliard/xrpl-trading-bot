# XRPL Ticker Lister

A simple ticker lister for the XRP Ledger.

## What You Get

When you run this script, it will generate and display the **top trading pairs** on the XRP Ledger, including: 
+ Volume (in XRP)
+ Number of exchanges
+ Unique buyers and sellers
+ Direct marketplace link

This allows you to quickly see the most active markets on the XRPL.

## Installation

1. Clone the repository:
```sh
git clone https://github.com/adrienbailliard/xrpl-ticker-lister.git
```

2. Navigate to the project folder:
```sh
cd xrpl-ticker-lister
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
