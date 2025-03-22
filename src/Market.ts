import { Currency, LedgerEntry, OfferCreateFlags } from "xrpl";
import { MarketCurrency, MarketSide, RippleStateProcessed, Offer } from "./types";
import { getCurrencySymbol, getCurrencyId, getAmountValue } from "./utils.js";
import { DROPS_PER_XRP, INTERVAL_TIME, BUY, SELL, XRP_SYMBOL, ONE_BILLION } from "./constants.js";

import Node from "./Node.js";
import Book from "./Book.js";
import Issuer from "./Issuer.js";
import CircularBuffer from "./CircularBuffer.js";

import { createRequire } from "module";
const config = createRequire(import.meta.url)("../config.json");


const benchmarkQualitiesNumber = config.benchmarkAveragingPeriod * 60 * 1000 / INTERVAL_TIME;



export default class Market
{
	// This ensures that offers do not exceed the actual available funds in the wallets.
	private static walletFunds: Record<string, Record<string, number>> = {};

	readonly currencies: [ MarketCurrency, MarketCurrency ];

	private _tick!: number;
	private profitSpread!: number;
	private secureSpread!: number;
	private minSpread!: number;
	private tradeTriggerSpread!: number;
	private spreadsIntervalId!: NodeJS.Timeout;

	private readonly benchmarks: [ Offer | undefined, Offer | undefined ];
	private readonly benchmarkQualities: [ CircularBuffer<number>, CircularBuffer<number> ];
	private readonly benchmarkQualitiesAverages: [ number, number ];

	private readonly amountsToIgnore: [ number, number ];
	private readonly books: [ Book, Book ];
	private readonly issuers: Array<Issuer>;



	static updateWalletBalance(accountRoot: LedgerEntry.AccountRoot): void
	{
		if (Market.walletFunds[XRP_SYMBOL])
			Market.walletFunds[XRP_SYMBOL][accountRoot.Account] = parseFloat(accountRoot.Balance) - Node.lastLedgerClosed.reserve_base - accountRoot.OwnerCount * Node.lastLedgerClosed.reserve_inc;
	}



	static updateWalletFunds(processed: RippleStateProcessed): void
	{
		if (Market.walletFunds[processed.tokenId])
			Market.walletFunds[processed.tokenId][processed.Account] = processed.amount;
	}



	static resetWalletFunds(): void
	{
		Market.walletFunds = {};
	}



	constructor(currencies: [ Currency, Currency ], books: [ Book, Book ], issuers: Array<Issuer>)
	{
		this.amountsToIgnore = [ 0, 0 ];
		this.books = books;

		this.benchmarks = [ undefined, undefined ];
		this.benchmarkQualities = [ new CircularBuffer(benchmarkQualitiesNumber), new CircularBuffer(benchmarkQualitiesNumber) ];
		this.benchmarkQualitiesAverages = [ 0, 0 ];

		this.issuers = issuers;
		this.setTick();
		this.setProfitSpread();


		for (const issuer of this.issuers)
		{
			issuer.on("transferRateChange", () => this.setProfitSpread());
			issuer.on("tickSizeChange", () => this.setTick())
		}


		this.currencies = currencies as [ MarketCurrency, MarketCurrency ];

		for (const currency of this.currencies)
		{
			currency.id = getCurrencyId(currency);
			currency.symbol = getCurrencySymbol(currency);

			if (!Market.walletFunds[currency.id])
				Market.walletFunds[currency.id] = {};
		}
	}



	set(balance: Record<string, number>)
	{
		for (const side of [ BUY, SELL ])
		{
			this.setAmountToIgnore(side, balance);
			this.setBenchmark(side);

			this.benchmarkQualities[side].fill(this.benchmarks[side]!.quality);
			this.benchmarkQualitiesAverages[side] = this.benchmarks[side]!.quality;
		}

		this.setAverageSpreads();
	}



	destroy()
	{
		clearInterval(this.spreadsIntervalId);
	}



	get tick(): number
	{
		return this._tick;
	}



	private setTick(): void
	{
		let tickSize: number = DROPS_PER_XRP.toString().length;

		for (const issuer of this.issuers)
		{
			if (issuer.tickSize && issuer.tickSize < tickSize)
				tickSize = issuer.tickSize;
		}

		this._tick = Math.pow(10, -tickSize + 1);
	}



	private setProfitSpread(): void
	{
		let profitSpread: number = config.baseProfitSpread;

		for (const issuer of this.issuers)
		{
			if (issuer.transferRate)
				profitSpread += issuer.transferRate / ONE_BILLION - 1;
		}

		this.profitSpread = 1 + profitSpread;
	}



	private updateAverageSpreads(): void
	{
		for (let i = 0; i < 2; i++)
		{
			this.benchmarkQualitiesAverages[i] += (this.benchmarks[i]!.quality - this.benchmarkQualities[i].shift()!) / benchmarkQualitiesNumber;
			this.benchmarkQualities[i].push(this.benchmarks[i]!.quality);
		}

		this.secureSpread = this.benchmarkQualitiesAverages[BUY] * this.benchmarkQualitiesAverages[SELL] - 1;

		this.minSpread = Math.max(1 + this.secureSpread * config.spreadAverageRatio.minSpread, this.profitSpread);
		this.tradeTriggerSpread = 1 + this.secureSpread * config.spreadAverageRatio.tradeTrigger;
	}



	private setAverageSpreads(): void
	{
		this.updateAverageSpreads();
		this.spreadsIntervalId = setInterval(() => this.updateAverageSpreads(), INTERVAL_TIME);
	}



	setAmountToIgnore(side: MarketSide, balance: Record<string, number>): void
	{
		this.amountsToIgnore[side] = config.ignoreOfferAmountBalanceRatio * (balance[this.currencies[side].id] + balance[this.currencies[1 - side].id] * this.books[1 - side].getOffer(0)!.quality);
	}



	setBenchmark(side: MarketSide): void
	{
		this.benchmarks[side] = this.skipParasiteOffers(side, (offer: Offer) => offer.isClosed === true);
	}



	private skipParasiteOffers(side: MarketSide, predicate: (offer: Offer) => boolean): Offer
	{
		const remainingFunds: Record<string, number> = {}, liquidOffers: Array<Offer> = [];
		let skipedAmount: number = 0, index: number = -1, i: number, offer: Offer;

		do
		{
			while ((offer = this.books[side].getOffer(++index)!).Expiration && offer.Expiration <= Node.lastLedgerClosed.ledger_time);


			if (!remainingFunds[offer.Account])
				remainingFunds[offer.Account] = Market.walletFunds[this.currencies[side].id][offer.Account] || parseFloat(offer.owner_funds!);

			const availableAmount = Math.min(remainingFunds[offer.Account], getAmountValue(offer.TakerGets));


			if (availableAmount > 0)
			{
				remainingFunds[offer.Account] -= availableAmount;

				if (predicate(offer))
				{
					skipedAmount += availableAmount;
					liquidOffers.push(offer);
				}
			}
		}

		while (skipedAmount <= this.amountsToIgnore[side] || liquidOffers.length === 0);


		// Tolerance for small offers

		const tolerance = 1 + this.secureSpread * config.spreadAverageRatio.smallOffersTolerance;
		for (i = liquidOffers.length - 1; i > 0 && offer.quality / liquidOffers[i - 1].quality <= tolerance; i--);


		return liquidOffers[i];
	}



	getSignal(side: MarketSide): number
	{
		/*
	    Conditions for an offer to be considered as a target:
	        - The offer must be valid (not expired due to LastLedgerSequence).
	        - The minimum spread must be met or the reference quality must be less than or equal to the target.
	        - The profit spread must be respected.
	    */

		const target: Offer = this.skipParasiteOffers(side, (preliminaryTarget: Offer): boolean => 
			(!preliminaryTarget.LastLedgerSequence || preliminaryTarget.LastLedgerSequence > Node.lastLedgerClosed.ledger_index)
			&& (preliminaryTarget.quality * this.benchmarks[1 - side]!.quality >= this.minSpread || this.benchmarkQualitiesAverages[side] <= preliminaryTarget.quality)
			&& preliminaryTarget.quality * this.benchmarkQualitiesAverages[1 - side] > this.profitSpread);



		// Create a transaction if the opposite offer is interesting.

		if (target.quality * this.benchmarks[1 - side]!.quality <= this.tradeTriggerSpread)
			return 1 / this.benchmarks[1 - side]!.quality * (1 - this._tick);
		else
			return target.quality * (1 - this._tick);
	}
}