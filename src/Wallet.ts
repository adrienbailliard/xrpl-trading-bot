import { Wallet as XRPLWallet, Currency, SubmitResponse, Transaction, AccountOffer, Amount, Payment,
	PaymentFlags, OfferCreate, LedgerEntry, OfferCreateFlags, TransactionStream } from "xrpl";

import { getCurrencyId, log, displayAmount, getCurrencySymbol, formatAmount, getAmountValue } from "./utils.js";
import { XRP_SYMBOL, BUY, SELL, DROPS_PER_XRP } from "./constants.js";
import { MarketSide, Offer, MarketCurrency, FillableTransaction, RippleStateProcessed } from "./types";

import Node from "./Node.js";
import DiscordBot from "./DiscordBot.js";
import Market from "./Market.js";

import { createRequire } from "module";
const config = createRequire(import.meta.url)("../config.json");



export default class Wallet
{
	readonly id: string;

	private sequence!: number;
	private lastPendingTxSequence!: number;
	private reserve!: number;
	private specialPendingTx: null | number;

	private readonly balance: Record<string, number>;
	private readonly keys: XRPLWallet;
	private readonly exposureLimit: number;
	private readonly signals: [ number | null, number | null ];
	private readonly lastOffersCreation: [ number | null, number | null ];
	private readonly market: Market;
	private readonly offers: [ Offer | null, Offer | null ];



	constructor(keys: XRPLWallet, market: Market, exposureLimit: number)
	{
		if (market.currencies[SELL].id === XRP_SYMBOL)
			exposureLimit *= DROPS_PER_XRP;

		this.exposureLimit = exposureLimit;
		this.keys = keys;
		this.id = this.keys.address;
		this.balance = {};
		this.specialPendingTx = null;
		this.market = market;
		this.signals = [ null, null ];
		this.offers = [ null, null ];
		this.lastOffersCreation = [ null, null ];
	}



	destroy()
	{
		this.market.destroy();
	}



	handleOfferUpdate(side: MarketSide, nodeType: string, fields: OfferCreate): void
	{
		if (nodeType === "CreatedNode")
			this.lastOffersCreation[side] = fields.Sequence!;


		if (this.offers[side] && fields.Sequence === this.offers[side].Sequence)
		{
			if (nodeType === "DeletedNode")
				this.offers[side] = null;

			else if (nodeType === "ModifiedNode")
			{
				this.offers[side].TakerGets = fields.TakerGets;
				this.offers[side].TakerPays = fields.TakerPays;
			}
		}
	}



	handleOfferError(side: MarketSide, tx: TransactionStream & { tx_json: OfferCreate }): void
	{
		if (tx.engine_result !== "tesSUCCESS")
		{
			if (tx.engine_result === "tecINSUF_RESERVE_OFFER" && tx.tx_json.OfferSequence === this.lastOffersCreation[side])
				this.cancelOffer(tx.tx_json.OfferSequence);

			if (this.offers[side] && tx.tx_json.Sequence === this.offers[side].Sequence)
				this.offers[side] = null;
		}
	}



	async cancelOffer(sequence: number, taker?: { gets: Amount, pays: Amount }): Promise<void>
	{
		const response: SubmitResponse = await this.fillAndSubmit({
		 	"TransactionType": "OfferCancel",
		    "OfferSequence": sequence
		});

		const commonExtract: string = "offer " + (taker ? "of **" + displayAmount(taker.gets) + " " + getCurrencySymbol(taker.gets) + "** for **" + displayAmount(taker.pays) + " " + getCurrencySymbol(taker.pays) + "**" : "**#" + sequence + "**");

		if (response.result.engine_result === "tesSUCCESS")
			log(this.keys.address, "**Cancellation** of the " + commonExtract + " issued");
		else
			log(this.keys.address, "Unable **to cancel** the " + commonExtract + ": **" + response.result.engine_result + "**", true);
	}



	private async setTokensBalance(): Promise<void>
	{
		const lines = (await Node.request({
			"command": "account_lines",
			"account": this.keys.address
		})).result.lines;


		this.balance[this.market.currencies[BUY].id] = 0;
		this.balance[this.market.currencies[SELL].id] = 0;


		for (const line of lines)
		{
			const currency: Currency = {
				currency: line.currency,
				issuer: line.account
			};

			this.balance[getCurrencyId(currency)] = parseFloat(line.balance);
		}
	}



	handleAccountBalance(accountRoot: LedgerEntry.AccountRoot): void
	{
		this.balance[XRP_SYMBOL] = parseInt(accountRoot.Balance) - this.reserve;
	}



	handleAccountFunds(processed: RippleStateProcessed): void
	{
		this.balance[processed.tokenId] = processed.amount;
	}



	async set(): Promise<void>
	{
		await DiscordBot.protectChannel(this.keys.address, this.market.currencies[BUY].symbol + "┃" + this.market.currencies[SELL].symbol);
		await this.setTokensBalance();


		const accountData = (await Node.request({
			"command": "account_info",
  			"account": this.keys.address
		})).result.account_data;


		const offers: Array<AccountOffer> = (await Node.request({
	  		"command": "account_offers",
	  		"account": this.keys.address
	  	})).result.offers!;


	  	this.sequence = accountData.Sequence;
		this.lastPendingTxSequence = this.sequence - 1;

		for (const offer of offers)
			this.cancelOffer(offer.seq, { gets: offer.taker_gets, pays: offer.taker_pays });


		this.setReserve();
		this.handleAccountBalance(accountData);

		this.market.set(this.balance);
	}



	checkTxSequence(tx: Transaction): void
	{
		if (tx.Sequence! >= this.sequence)
			this.sequence = tx.Sequence! + 1;

		this.lastPendingTxSequence = tx.Sequence!;
	}



	private setReserve(): void
	{
		let ownerCountForecast = this.market.currencies[BUY].issuer !== undefined && this.market.currencies[SELL].issuer !== undefined ? 4 : 3;

		// This "+ 1" corresponds to the fee allocation
		this.reserve = Node.lastLedgerClosed.reserve_base + Node.lastLedgerClosed.reserve_inc * (ownerCountForecast + 1);
	}



	private fillAndSubmit(tx: FillableTransaction<Transaction>): Promise<SubmitResponse>
	{
		tx.Account = this.keys.address;
		tx.Sequence = this.sequence++;
		tx.Fee = Node.lastLedgerClosed.fee_base.toString();

		return Node.submit(this.keys.sign(tx as Transaction).tx_blob);
	}



	private async depositExcess(): Promise<void>
	{
		const quoteToken: MarketCurrency = this.market.currencies[SELL];
		const amount: Amount = formatAmount(quoteToken, this.balance[quoteToken.id] - this.exposureLimit);

		const tx_json: FillableTransaction<Payment> = {
		 	"TransactionType": "Payment",
			"Destination": config.reserveAddress,
			"Amount": amount
		};

		// Send tokens, receive XRP

		if (quoteToken.id !== XRP_SYMBOL)
		{
			tx_json.Amount = "100000000000000";
			tx_json.SendMax = amount;
			tx_json.Flags = PaymentFlags.tfPartialPayment;
		}


		const response: SubmitResponse = await this.fillAndSubmit(tx_json);


		if (response.result.engine_result === "tesSUCCESS")
			log(this.keys.address, "A **deposit** of **" + displayAmount(amount) + " " + quoteToken.symbol + "** has been issued");
		else
			log(this.keys.address, "Unable to **deposit** some " + quoteToken.symbol + ": **" + response.result.engine_result + "**", true);
	}



	async tradingProcess(sides: Array<MarketSide> = [ BUY, SELL ]): Promise<void>
	{
		if (this.sequence - this.lastPendingTxSequence > 8)
			return;


		for (const side of sides)
		{
			this.market.setAmountToIgnore(side, this.balance);
			this.market.setBenchmark(side);
		}


		for (const side of sides)
		{
			// Check if the balance is sufficient and if the exposure limit allows the trade

			if (!this.signals[side] && this.balance[XRP_SYMBOL] + Node.lastLedgerClosed.reserve_inc > 0 && this.balance[this.market.currencies[side].id] > 0 && (this.exposureLimit > 0 || side === BUY))
			{
				this.signals[side] = this.market.getSignal(side);

				// Check if the current offer is outdated based on price (quality) and amount (TakerGets)

				if (!this.offers[side] || this.signals[side] < this.offers[side].quality || this.signals[side] > this.offers[side].quality / (1 - this.market.tick) || getAmountValue(this.offers[side].TakerGets) < this.balance[this.market.currencies[side].id])
					await this.createOffer(side, this.signals[side]);

				this.signals[side] = null;
			}
		}
	}



	getPrice(side: MarketSide, quality: number): number
	{
		let price = (side === SELL) ? 1 / quality : quality;

		if (this.market.currencies[SELL].id === XRP_SYMBOL)
			price /= DROPS_PER_XRP;

		else if (this.market.currencies[BUY].id === XRP_SYMBOL)
			price *= DROPS_PER_XRP;

		return price;
	}



	private async createOffer(side: MarketSide, quality: number): Promise<void>
	{
		const takerGetsValue: number = side === SELL && this.exposureLimit < this.balance[this.market.currencies[side].id] ? this.exposureLimit : this.balance[this.market.currencies[side].id];

		const tx_json: FillableTransaction<OfferCreate> = {
		 	"TransactionType": "OfferCreate",
		    "Flags": OfferCreateFlags.tfSell,
		    "TakerGets": formatAmount(this.market.currencies[side], takerGetsValue),
		    "TakerPays": formatAmount(this.market.currencies[1 - side], takerGetsValue * quality)
		};


		if (this.offers[side])
			tx_json.OfferSequence = this.offers[side].Sequence;


		const commonExtract: string = "of **" + displayAmount(tx_json.TakerGets) + " " + this.market.currencies[side].symbol + "** for **" + displayAmount(tx_json.TakerPays) + " " + this.market.currencies[1 - side].symbol + "** (" + this.getPrice(side, quality).toPrecision(config.displayNDigits) + " " + this.market.currencies[SELL].symbol + ")";
		const response: SubmitResponse = await this.fillAndSubmit(tx_json);


		if (response.result.engine_result !== "tefPAST_SEQ")
			this.offers[side] = Object.assign(tx_json, { "quality": quality }) as Offer;


		if (response.result.engine_result === "tesSUCCESS")
			log(this.keys.address, "Offer " + commonExtract + " issued");
		else
			log(this.keys.address, "Unable **to issue** an offer " + commonExtract + ": **" + response.result.engine_result + "**", true);
	}



	private async fillReserve(emergencyToken: MarketCurrency): Promise<void>
	{
		const response: SubmitResponse = await this.fillAndSubmit({
			"TransactionType": "Payment",
			"Destination": this.keys.address,
			"Amount": (-this.balance[XRP_SYMBOL]).toString(),
			"SendMax": formatAmount(emergencyToken, this.balance[emergencyToken.id]),
			"Flags": PaymentFlags.tfPartialPayment
		});

		if (response.result.engine_result === "tesSUCCESS")
			log(this.keys.address, "**Filling** the wallet reserve");
		else
			log(this.keys.address, "Unable to **fill** the wallet reserve: **" + response.result.engine_result + "**", true);
	}



	manageBalanceChange(): void
	{
		if (this.specialPendingTx)
			return;

		const quoteToken: MarketCurrency = this.market.currencies[SELL];


		if (this.balance[XRP_SYMBOL] <= 0)
		{
			const tokenSide: MarketSide = this.balance[quoteToken.id] > 0 ? SELL : BUY;


			// The reserve is not funded

			if (this.balance[XRP_SYMBOL] + Node.lastLedgerClosed.reserve_inc <= 0)
			{
				if (this.balance[this.market.currencies[tokenSide].id] > 0)
				{
					this.specialPendingTx = this.sequence;
					this.fillReserve(this.market.currencies[tokenSide]);
				}
			}


			// Avoid XRP offer execution that could deplete the reserve

			else if (this.market.currencies[1 - tokenSide].symbol === XRP_SYMBOL)
			{
				const offer = this.offers[1 - tokenSide];

				if (offer && offer.Sequence === this.lastOffersCreation[1 - tokenSide])
				{
					this.offers[1 - tokenSide] = null;
					this.cancelOffer(offer.Sequence, { gets: offer.TakerGets, pays: offer.TakerPays });
				}
			}
		}


		else if (this.balance[quoteToken.id] > this.exposureLimit)
		{
			this.specialPendingTx = this.sequence;
			this.depositExcess();
		}
	}



	checkSpecialPendingTx(lastTxSequenceClosed: number): void
	{
		if (this.specialPendingTx === lastTxSequenceClosed)
			this.specialPendingTx = null;
	}
}