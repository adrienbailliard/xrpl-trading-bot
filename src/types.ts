import {
	Amount,
	TransactionStream,
	Transaction,
	AccountSet,
	LedgerEntry,
	BaseResponse,
	Currency
} from "xrpl";



/**
* @category Rippled
*/

type RippleStateProcessed = {
	Account: string,
	tokenId: string,
	amount: number
}



/**
* @category Offer
*/

type Offer = {
	Account: string,
	Sequence: number,
	TakerGets: Amount,
	TakerPays: Amount,
	quality: number,
	isClosed?: boolean,
	LastLedgerSequence?: number,
	Expiration?: number,
	owner_funds?: string
}



/**
* @category Transaction
*/

type FillableTransaction<T extends Transaction> = Partial<T> & Omit<T, "Account">;



/**
* @category Market
*/

type MarketCurrency = Currency & { id: string, symbol: string };
type MarketSide = 0 | 1;

type MarketSettings = {
	"base": Currency,
	"quote": Currency,
	"exposureLimit": number
}



/**
* @category Events
*/

type BaseEvents = {
	"error": (error: unknown) => void
}

type NodeEvents = {
	"transaction": (tx: TransactionStream) => void,
	"lostSync": () => void,
	"sync": () => void
}

type IssuerEvents = {
	"tickSizeChange": () => void,
	"transferRateChange": () => void
}



/**
* @category Streams
*/

type AccountSetStream = TransactionStream & {
	tx_json: AccountSet,
	meta: {
		AffectedNodes: [{
			ModifiedNode: {
			    LedgerEntryType: string,
			    LedgerIndex: string,
			    FinalFields: LedgerEntry.AccountRoot,
			    PreviousFields: LedgerEntry.AccountRoot,
			    PreviousTxnID: string,
			    PreviousTxnLgrSeq: number
			}
		}],
		TransactionIndex: number,
  		TransactionResult: string
	}
}



export {
	Offer,
	BaseEvents,
	NodeEvents,
	IssuerEvents,
	AccountSetStream,
	MarketCurrency,
	MarketSide,
	MarketSettings,
	FillableTransaction,
	RippleStateProcessed
}