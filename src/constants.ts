import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from "discord.js";
import { MarketSide } from "./types";



/**
* @category Discord
*/


const COMMANDS: Array<SlashCommandBuilder> = [

	new SlashCommandBuilder()
		.setName('delete')
		.setDescription('Deletes channels')
		.addSubcommand(subcommand =>
			subcommand
				.setName('category')
				.setDescription('Deletes a category and its channels')
				.addChannelOption(option =>
					option
						.setName("target")
						.setDescription("The category to delete")
						.addChannelTypes(ChannelType.GuildCategory)
						.setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('channels')
				.setDescription('Deletes all server channels'))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.setDMPermission(false) as SlashCommandBuilder,

	new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Ends the bot execution')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder
];



/**
* @category XRP Ledger
*/


const XRP_SYMBOL: string = "XRP";
const DROPS_PER_XRP: number = 1000000;
const XRPL_MAX_PRECISION: number = 16;
const INTERVAL_TIME: number = 1000;
const BUY: MarketSide = 0, SELL: MarketSide = 1;
const ONE_BILLION: number = 1000000000;




export { COMMANDS, DROPS_PER_XRP, INTERVAL_TIME, XRP_SYMBOL, BUY, SELL, XRPL_MAX_PRECISION, ONE_BILLION };