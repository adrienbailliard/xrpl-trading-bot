import Node from "./Node.js";
import DiscordBot from "./DiscordBot.js";
import Manager from "./Manager.js";
import Book from "./Book.js";
import Wallet from "./Wallet.js";
import Market from "./Market.js";
import Issuer from "./Issuer.js";

import { Currency, Wallet as XRPLWallet, OfferCreate, TransactionStream } from "xrpl";
import { log, proccessRippleState } from "./utils.js";
import { BUY, SELL, XRP_SYMBOL } from "./constants.js";
import { MarketSettings, AccountSetStream, RippleStateProcessed } from "./types";

import { createRequire } from "module";
const config = createRequire(import.meta.url)("../config.json");



async function main(): Promise<void>
{
	process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
	process.stdout.write('\x1b]0;Ravager\x07');
	console.log("Ravager, by Adrien Bailliard\nOne of the best XRPL trading bots\n");


	await DiscordBot.init();

	const bookManager: Manager<Book> = new Manager();
	const issuerManager: Manager<Issuer> = new Manager();
	const walletManager: Manager<Wallet> = new Manager();

	const node: Node = new Node();


	log(config.discord.monitoringChannel, "Synchronization **in progress**");

	let lastConnectionAttempt: number = Date.now();



	node.on("error", (error: unknown) =>
	{
		if (!(error instanceof Error && error.message === "notSynced"))
			throw error;
	});



	node.on("sync", async () =>
	{
		log(config.discord.monitoringChannel, "Synchronization **complete** after **" + ((Date.now() - lastConnectionAttempt) / 1000).toFixed(2) + "s** of waiting");

		const walletSettings: Array<[ string, MarketSettings ]> = Object.entries(config.wallets);
		const promises: Array<Promise<void>> = [];


		// Set up issuers for the wallets

		for (const [ , marketSettings ] of walletSettings)
		{
			for (const address of [ marketSettings.base.issuer, marketSettings.quote.issuer ])
			{
				if (address !== undefined && issuerManager.get(address) === undefined)
				{
					const issuer = new Issuer(address);
		            issuerManager.add(issuer);
		            promises.push(issuer.setMarketParams());
				}
			}
		}

		await Promise.all(promises);


		// Initialize wallets

		walletSettings.forEach(async ([ seed, marketSettings ]) =>
		{
			const keys = XRPLWallet.fromSeed(seed);
			const currencies: [ Currency, Currency ] = [ marketSettings.base, marketSettings.quote ];
			const books: [ Book, Book ] = [ new Book(marketSettings.base, marketSettings.quote, keys.address, BUY), new Book(marketSettings.quote, marketSettings.base, keys.address, SELL) ];
			const issuers: Array<Issuer> = [];

			for (let i = 0; i < currencies.length; i++)
			{
				await books[i].set();
				bookManager.add(books[i]);

				if (currencies[i].issuer !== undefined)
					issuers.push(issuerManager.get(currencies[i].issuer!)!);
			}

			const market: Market = new Market(currencies, books, issuers);
			const wallet: Wallet = new Wallet(keys, market, marketSettings.exposureLimit);

			await wallet.set();
			walletManager.add(wallet);

			wallet.manageBalanceChange();
			wallet.tradingProcess();
		});
	});



	node.on("lostSync", () =>
	{
		lastConnectionAttempt = Date.now();

		Market.resetWalletFunds();
		bookManager.destroyAll();
		walletManager.destroyAll();
		issuerManager.destroyAll();

		log(config.discord.monitoringChannel, "**Network** synchronization **lost**");
	});



	const TRADING_PROCESS = 1, BALANCE_CHANGE = 2;

	node.on("transaction", async (tx: TransactionStream) =>
	{
		const txWallet: Wallet | undefined = walletManager.get(tx.tx_json!.Account);


		// Anticipate OfferCreate transactions that are not yet included in the ledger

		if (tx.validated === false)
		{
			if (txWallet)
				txWallet.checkTxSequence(tx.tx_json!);

			else if (tx.tx_json!.TransactionType === "OfferCreate")
			{
				const book: Book | undefined = bookManager.get(Book.getId(tx.tx_json!.TakerGets, tx.tx_json!.TakerPays));

				if (book !== undefined)
				{
					book.add(tx.tx_json!, false);
					await walletManager.get(book.associatedAccount)?.tradingProcess([ book.marketSide ]);
				}
			}
		}


		else if (tx.tx_json!.TransactionType === "AccountSet")
			issuerManager.get(tx.tx_json!.Account)?.handleAccountSet(tx as AccountSetStream);


		else
		{
			const affectedAccounts: Record<string, number> = {};


			// Correct previously anticipated OfferCreate transactions

			if (tx.tx_json!.TransactionType === "OfferCreate")
			{
				const book: Book | undefined = bookManager.get(Book.getId(tx.tx_json!.TakerGets, tx.tx_json!.TakerPays));

				if (txWallet)
					txWallet.handleOfferError(book!.marketSide, tx as TransactionStream & { tx_json: OfferCreate });

				else if (book !== undefined)
				{
					book.delete(tx.tx_json!);

					if (walletManager.get(book.associatedAccount))
						affectedAccounts[book.associatedAccount] |= TRADING_PROCESS;
				}
			}


			// Process metadata

			for (const affectedNode of tx.meta!.AffectedNodes as any[])
			{
				for (const type in affectedNode)
				{
					const currentFields: any = affectedNode[type].NewFields ? affectedNode[type].NewFields : affectedNode[type].FinalFields;

					switch (affectedNode[type].LedgerEntryType)
					{
						case "Offer":
							const book = bookManager.get(Book.getId(currentFields.TakerGets, currentFields.TakerPays));

							if (book)
							{
								const wallet: Wallet | undefined = walletManager.get(currentFields.Account);

								if (wallet)
									wallet.handleOfferUpdate(book.marketSide, type, currentFields);

								else
								{
									if (type !== "CreatedNode")
									{
										const previousFields = affectedNode[type].PreviousFields || {};

										book.delete({
											Account: currentFields.Account,
											Sequence: currentFields.Sequence,
											TakerGets: previousFields.TakerGets || currentFields.TakerGets,
											TakerPays: previousFields.TakerPays || currentFields.TakerPays,
											TransactionType: "OfferCreate"
										});
									}
									else
										currentFields.owner_funds = (tx.tx_json as any).owner_funds;

									if (type !== "DeletedNode")
										book.add(currentFields, true);

									if (walletManager.get(book.associatedAccount))
										affectedAccounts[book.associatedAccount] |= TRADING_PROCESS;
								}
							}
							break;

						case "AccountRoot":
							if (currentFields)
							{
								const wallet: Wallet | undefined = walletManager.get(currentFields.Account);

								if (wallet)
								{
									wallet.handleAccountBalance(currentFields);
									affectedAccounts[currentFields.Account] = TRADING_PROCESS | BALANCE_CHANGE;
								}
								else
									Market.updateWalletBalance(currentFields);
							}
							break;

						case "RippleState":
							const rippleStateProcessed: RippleStateProcessed = proccessRippleState(currentFields);
							const wallet: Wallet | undefined = walletManager.get(rippleStateProcessed.Account);

							if (wallet)
							{
								wallet.handleAccountFunds(rippleStateProcessed);
								affectedAccounts[rippleStateProcessed.Account] = TRADING_PROCESS | BALANCE_CHANGE;
							}
							else
								Market.updateWalletFunds(rippleStateProcessed);
							break;
					}
				}
			}


			if (txWallet)
				txWallet.checkSpecialPendingTx(tx.tx_json!.Sequence!);


			for (const account in affectedAccounts)
			{
				if (affectedAccounts[account] & BALANCE_CHANGE)
					walletManager.get(account)!.manageBalanceChange();

				if (affectedAccounts[account] & TRADING_PROCESS)
					await walletManager.get(account)!.tradingProcess();
			}
		}
	});



	await node.init();
}


main();