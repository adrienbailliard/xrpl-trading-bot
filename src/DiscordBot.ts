import { Client, GatewayIntentBits, ChannelType, TextChannel, EmbedBuilder, ColorResolvable, CategoryChannel, DMChannel, NonThreadGuildBasedChannel } from "discord.js";
import { COMMANDS } from "./constants.js";

import { getChannelName } from "./utils.js";

import { createRequire } from "module";
const config = createRequire(import.meta.url)("../config.json");



export default class DiscordBot
{	
	private static readonly client: Client = new Client({
		intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers ]
	});;

	private static readonly protectedChannels: Record<string, Set<string>> = {};



	static init(): Promise<void>
	{
		return new Promise(resolve =>
		{
			this.client.once("ready", async (readyClient) => 
			{
				readyClient.application!.commands.set(COMMANDS);
				await this.protectChannel(config.discord.monitoringChannel);
				resolve();
			});



			this.client.on('interactionCreate', async (interaction) => 
			{
				if (!interaction.isChatInputCommand()) return;

				switch (interaction.commandName)
				{
					case "delete":
						const category: CategoryChannel | null = interaction.options.getChannel("target");

						if (category && category.id !== (interaction.channel as TextChannel).parentId)
							await interaction.reply("Deletion **in progress**");

						interaction.guild!.channels.cache.forEach(channel => {
							if (category === null || channel.parentId === category.id || channel.id === category.id)
								channel.delete();
						});
						break;

					case "stop":
						await interaction.reply("Shutdown **in progress**");
						process.exit();
				}
			});



			this.client.on('channelDelete', async (channel: NonThreadGuildBasedChannel | DMChannel) => 
			{
				if (channel.type === ChannelType.GuildText && channel.topic && this.protectedChannels[channel.topic])
				{
					const clone: TextChannel = await channel.clone();
					this.protectedChannels[channel.topic].add(clone.id);
				}
			});



			this.client.login(config.discord.token).catch((error: Error) =>
			{
				console.log("\n\x1b[31m" + ("code" in error && (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') ? "Please ensure you have an internet connection" : error.toString()) + "\x1b[0m\n\n");
				process.exit(1);
			});
		});
	}



	static async protectChannel(id: string, name: string = id): Promise<void>
	{
		this.protectedChannels[id] = new Set();

		for (const [ guildId, guild ] of this.client.guilds.cache)
		{
			const target = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText && channel.topic === id)
				|| await guild.channels.create({ name: getChannelName(name), type: ChannelType.GuildText, topic: id });

			this.protectedChannels[id].add(target.id);
		}
	}



	static async log(id: string, message: string, error: boolean = false): Promise<void>
	{
		const color: ColorResolvable = ((error) ? config.discord.errorColor : config.discord.confirmationColor) as ColorResolvable;


		for (const channelId of this.protectedChannels[id])
		{
			const channel = this.client.channels.cache.get(channelId) as TextChannel;

			if (channel === undefined)
				this.protectedChannels[id].delete(channelId);
			else
				await channel.send({ embeds: [ new EmbedBuilder().setDescription(message).setColor(color) ] });
		}
	}
}