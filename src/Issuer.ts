import { IssuerEvents, AccountSetStream } from "./types";

import EventEmitter from "./EventEmitter.js";
import Node from "./Node.js";



export default class Issuer extends EventEmitter<IssuerEvents>
{
	readonly id: string;
	private readonly address: string;

	private _tickSize: number | undefined;
	private _transferRate: number | undefined;



	constructor(address: string)
	{
		super();

		this.id = address;
		this.address = address;
	}



	destroy() {}



	get tickSize(): number | undefined
	{
		return this._tickSize;
	}



	get transferRate(): number | undefined
	{
		return this._transferRate;
	}



	async setMarketParams(): Promise<void>
	{
		const accountData = (await Node.request({
	  		"command": "account_info",
	  		"account": this.address
	  	})).result.account_data;


	  	this._tickSize = accountData.TickSize;
	  	this._transferRate = accountData.TransferRate;
	}



	handleAccountSet(tx: AccountSetStream): void
	{
		const { FinalFields } = tx.meta.AffectedNodes[0].ModifiedNode;

		if (FinalFields.TransferRate !== this._transferRate)
		{
			this._transferRate = FinalFields.TransferRate;
			this.emit("transferRateChange");
		}

		if (FinalFields.TickSize !== this._tickSize)
		{
			this._tickSize = FinalFields.TickSize;
			this.emit("tickSizeChange");
		}
	}
}