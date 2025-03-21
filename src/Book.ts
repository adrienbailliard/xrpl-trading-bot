import Node from "./Node.js";

import { Currency, BookOffer, Amount, OfferCreate } from "xrpl";
import { Offer, MarketSide } from "./types";
import { getCurrencyId, getAmountValue } from "./utils.js";
import { ONE_BILLION } from "./constants.js";



export default class Book
{
	private readonly takerGets: Currency;
	private readonly takerPays: Currency;

	readonly id: string;
	readonly marketSide: MarketSide;
	readonly associatedAccount: string;

	private offers: Array<Offer>;



	constructor(takerGets: Currency, takerPays: Currency, associatedAccount: string, marketSide: MarketSide)
	{
		this.takerGets = takerGets;
		this.takerPays = takerPays;
		this.offers = [];

		this.id = Book.getId(takerGets, takerPays);
		this.associatedAccount = associatedAccount;
		this.marketSide = marketSide;
	}



	destroy() {}



	static getId(takerGets: Currency | Amount, takerPays: Currency | Amount): string
	{
		return getCurrencyId(takerGets) + getCurrencyId(takerPays);
	}



	getOffer(index: number): Offer | undefined
	{
		return this.offers[index];
	}



	async set(): Promise<void>
	{
		const bookOffers: Array<BookOffer> = (await Node.request({
	  		"command": "book_offers",
	  		"taker_gets": this.takerGets,
			"taker_pays": this.takerPays,
			"limit": ONE_BILLION,
			"ledger_index": Node.lastLedgerClosed.ledger_index
	  	})).result.offers;


	  	for (let i = 0; i < bookOffers.length; i++)
	  	{
	  		if (bookOffers[i].Account !== this.associatedAccount)
	  			this.offers.push(this.toOffer(bookOffers[i], true));
	  	}

	  	this.offers.sort((a: Offer, b: Offer) => a.quality - b.quality);
	}



	private toOffer(offer: BookOffer | OfferCreate, isClosed?: boolean): Offer
	{
		return Object.assign(offer, {
			Sequence: "TicketSequence" in offer ? offer.TicketSequence! : offer.Sequence!,
			isClosed: isClosed,
			quality: getAmountValue(offer.TakerPays) / getAmountValue(offer.TakerGets)
		});
	}



	private getInsertionIndex(quality: number): number
	{
		let start: number = 0, end: number = this.offers.length - 1, index: number;

		while (start <= end)
		{
		    index = Math.floor((start + end) / 2);

		    if (this.offers[index].quality <= quality)
		        start = index + 1;
		    else
		        end = index - 1;
		}

		return start;
	}



	private findIndex(offer: Offer): number
	{
		let index: number = this.getInsertionIndex(offer.quality) - 1;

		while (index >= 0 && (this.offers[index].Account !== offer.Account || this.offers[index].Sequence !== offer.Sequence))
			index = this.offers[index].quality === offer.quality ? index - 1 : -1;

		return index;
	}



	add(offerToCast: OfferCreate, isClosed: boolean): void
	{
		const offer: Offer = this.toOffer(offerToCast, isClosed);
		const index: number = this.getInsertionIndex(offer.quality);

		this.offers.splice(index, 0, offer);
	}



	delete(offerToCast: OfferCreate): void
	{
		const offer: Offer = this.toOffer(offerToCast);
		const index: number = this.findIndex(offer);

		if (index > -1)
			this.offers.splice(index, 1);
	}
}