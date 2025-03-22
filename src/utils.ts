import DiscordBot from "./DiscordBot.js";

import { Amount, Currency, LedgerEntry, convertHexToString } from "xrpl";
import { DROPS_PER_XRP, XRP_SYMBOL, XRPL_MAX_PRECISION } from "./constants.js";
import { MarketCurrency, RippleStateProcessed } from "./types";

import { createRequire } from "module";
const config = createRequire(import.meta.url)("../config.json");



function getCurrencyId(currency: Currency | Amount): string
{
	return (typeof currency === "object" && "issuer" in currency) ? currency.currency + currency.issuer : XRP_SYMBOL;
}



function getChannelName(name: string): string
{
	return name.replace(/[^a-zA-Z0-9┃ ]/g, '').replaceAll(" ", "-").toLowerCase();
}



function getCurrencySymbol(currency: Currency | Amount): string
{
	if (typeof currency === "string")
		return XRP_SYMBOL;
	else
		return currency.currency.length === 40 ? convertHexToString(currency.currency) : currency.currency;
}



function getCurrencyAmount(currency: Amount): number
{
	return (typeof currency === "object") ? parseFloat(currency.value) : parseFloat(currency) / DROPS_PER_XRP;
}



function getAmountValue(amount: Amount): number
{
	return parseFloat(typeof amount === "object" ? amount.value : amount);
}



function displayAmount(amount: Amount): string
{
	const value: string = getCurrencyAmount(amount).toPrecision(config.displayNDigits);
	return value.includes(".") ? value.replace(/\.?0+$/, '') : value;
}



function formatAmount(marketCurrency: MarketCurrency, value: number): Amount
{
	if (marketCurrency.issuer)
	{
		return {
			issuer: marketCurrency.issuer,
			currency: marketCurrency.currency,
			value: value.toPrecision(XRPL_MAX_PRECISION)
		};
	}

	else
		return Math.ceil(value).toString();
}


// Extract account, token ID, and amount from the ledger entry

function proccessRippleState(rippleState: LedgerEntry.RippleState): RippleStateProcessed
{
	if (rippleState.LowNode !== "0")
	{
		return {
			Account: rippleState.HighLimit.issuer,
			tokenId: getCurrencyId({
				currency: rippleState.Balance.currency,
				issuer: rippleState.LowLimit.issuer
			}),
			amount: -parseFloat(rippleState.Balance.value)
		}
	}
	
	else
	{
		return {
			Account: rippleState.LowLimit.issuer,
			tokenId: getCurrencyId({
				currency: rippleState.Balance.currency,
				issuer: rippleState.HighLimit.issuer
			}),
			amount: parseFloat(rippleState.Balance.value)
		}
	}
}



async function log(channelId: string, message: string, error: boolean = false): Promise<void>
{
	let consoleMessage: string = "\n" + new Date().toLocaleString() + "\n" + message.replaceAll("*", "") + '\n';

	if (error)
	{
		consoleMessage = "\x1b[31m" + consoleMessage + "\x1b[0m";
		message = "*" + message + "*";
	}

	console.log(consoleMessage);

	try {
		await DiscordBot.log(channelId, message, error);
	}
	catch {}
}



export { getCurrencyId, log, displayAmount, getCurrencySymbol, formatAmount, getAmountValue, proccessRippleState, getChannelName };