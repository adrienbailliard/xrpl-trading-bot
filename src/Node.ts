import EventEmitter from "./EventEmitter.js";

import { Client, ServerState, Request, SubmitResponse, LedgerStream, LedgerStreamResponse, RequestResponseMap, TransactionStream } from "xrpl";
import { NodeEvents } from "./types";



export default class Node extends EventEmitter<NodeEvents>
{
	private static readonly client: Client = new Client("ws://localhost:6006/");
	private static _lastLedgerClosed: LedgerStreamResponse;



	async init(): Promise<void>
	{
		await Node.client.connect();

		Node.client.on("transaction", (tx: TransactionStream) => this.emit("transaction", tx));
		Node.client.on("ledgerClosed", (ledgerClosed: LedgerStream) => Node._lastLedgerClosed = ledgerClosed);

		const result: any = (await Node.request({
		  	"command": "subscribe",
	  		"streams": [ "transactions_proposed", "ledger", "server" ]
		})).result;


		if ("ledger_index" in result)
			Node._lastLedgerClosed = result;


		let serverState: ServerState = result.server_status;

		if (serverState === "full")
			this.emit("sync");


		Node.client.connection.on("serverStatus", async (status) =>
		{
			if (status.server_status !== serverState)
			{
				if (status.server_status === "full")
					this.emit("sync");

				if (serverState === "full")
					this.emit("lostSync");

				serverState = status.server_status;
			}
		});
	}



	static get lastLedgerClosed(): LedgerStreamResponse
	{
		return Node._lastLedgerClosed;
	}



	static request<T extends Request>(request: T): Promise<RequestResponseMap<T>>
	{
		return Node.client.request(request);
	}



	static submit(txBlob: string): Promise<SubmitResponse>
	{
		return Node.client.submit(txBlob);
	}
}