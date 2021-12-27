import { WebSocketEvents } from "fagc-api-wrapper/dist/WebsocketListener"
import FAGCBot from "./FAGCBot"
import { Report } from "fagc-api-types"
import { MessageEmbed } from "discord.js"
import { GuildConfig } from "fagc-api-types"
import { Rcon } from "rcon-client/lib"

interface HandlerOpts<T extends keyof WebSocketEvents> {
	event: Parameters<WebSocketEvents[T]>[0]
	client: FAGCBot
}

export const communityCreated = ({
	client,
	event,
}: HandlerOpts<"communityCreated">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })
	client.infochannels.forEach((guildChannels) => {
		guildChannels.forEach(c => {
			const channel = client.channels.cache.get(c.channelID)
			if (!channel || !channel.isNotDMChannel()) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})
}

export const communityRemoved = ({ client, event }: HandlerOpts<"communityRemoved">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })
	client.infochannels.forEach((guildChannels) => {
		guildChannels.forEach(c => {
			const channel = client.channels.cache.get(c.channelID)
			if (!channel || !channel.isNotDMChannel()) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})
}

export const ruleCreated = ({ client, event }: HandlerOpts<"ruleCreated">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })
	client.infochannels.forEach((guildChannels) => {
		guildChannels.forEach(c => {
			const channel = client.channels.cache.get(c.channelID)
			if (!channel || !channel.isNotDMChannel()) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})
}

export const ruleRemoved = async ({ client, event }: HandlerOpts<"ruleRemoved">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })
	client.infochannels.forEach((guildChannels) => {
		guildChannels.forEach(c => {
			const channel = client.channels.cache.get(c.channelID)
			if (!channel || !channel.isNotDMChannel()) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})
}

export const report = async ({ client, event }: HandlerOpts<"report">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })

	let shouldPerformActions = false
	const guildConfigs: GuildConfig[] = []
	
	client.infochannels.forEach(async (guildChannels, guildID) => {
		const guildConfig = client.guildConfigs.get(guildID)
		if (!guildConfig) return
		if (
			guildConfig.ruleFilters?.includes(event.report.brokenRule) &&
			guildConfig.trustedCommunities?.includes(event.report.communityId)
		) {
			guildChannels.forEach(c => {
				const channel = client.channels.cache.get(c.channelID)
				if (!channel || !channel.isNotDMChannel()) return
				client.addEmbedToQueue(channel.id, embed)
			})
			shouldPerformActions = true
			guildConfigs.push(guildConfig)
		}
	})

	if (!shouldPerformActions) return // did not match any filters so return

	const isWhitelisted = await client.db.whitelist.findFirst({
		where: {
			playername: event.report.playername
		}
	})
	if (isWhitelisted) return // if the player is whitelisted, don't do anything

	// create the record for future safekeeping
	await client.db.fagcBan.create({
		data: {
			id: event.report.id,
			playername: event.report.playername,
			brokenRule: event.report.brokenRule,
			communityID: event.report.communityId,
		}
	})

	// ban in guilds that its supposed to
	guildConfigs.map((guildConfig) => {
		const reason = client.createBanMessage(event.report, guildConfig.guildId)
		if (!reason) return // if it is not supposed to do anything in this guild, then it won't do anything
		client.rcon.rconCommandGuild(`/sc game.ban_player("${event.report.playername}", "${reason}")`, guildConfig.guildId)
	})
}
export const revocation = async ({ client, event }: HandlerOpts<"revocation">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })

	let shouldPerformActions = false
	const guildConfigs: GuildConfig[] = []

	await Promise.all(client.infochannels.map(async(guildChannels, guildID) => {
		const guildConfig = client.guildConfigs.get(guildID)
		if (!guildConfig) return
		if (
			guildConfig.ruleFilters?.includes(event.revocation.brokenRule) &&
			guildConfig.trustedCommunities?.includes(event.revocation.communityId)
		) {
			guildChannels.forEach(c => {
				const channel = client.channels.cache.get(c.channelID)
				if (!channel || !channel.isNotDMChannel()) return
				client.addEmbedToQueue(channel.id, embed)
			})
			shouldPerformActions = true
			guildConfigs.push(guildConfig)
		}
	}))

	if (!shouldPerformActions) return // did not match any filters so return

	const isPrivateBanned = await client.db.privatebans.findFirst({
		where: {
			playername: event.revocation.playername
		}
	})
	if (isPrivateBanned) return // if the player is blacklisted, don't do anything

	// remove the report record
	await client.db.fagcBan.delete({
		where: {
			id: event.revocation.id
		}
	})

	const otherBan = await client.db.fagcBan.findFirst({
		where: {
			playername: event.revocation.playername
		}
	})

	// unban the player where it is wanted
	await Promise.allSettled(
		guildConfigs.map(async (guildConfig) => {
			const action = await client.getGuildAction(guildConfig.guildId)
			if (!action || action.revocation === "none") return // if it is not supposed to do anything in this guild, then it won't do anything
			// TODO: handling for custom actions
			client.rcon.rconCommandGuild(`/sc game.unban_player("${otherBan?.playername}")`, guildConfig.guildId)
		})
	)

	// if there is another FAGC report that conforms to the rules + communities, perform desired actions with it
	if (otherBan) {
		// there are other reports that the player is still banned for
		const report = await client.fagc.reports.fetchReport({ reportid: otherBan.id })
		if (!report) return
		// unban in guilds that its supposed to
		guildConfigs.map((guildConfig) => {
			const reason = client.createBanMessage(report, guildConfig.guildId)
			if (!reason) return // if it is not supposed to do anything in this guild, then it won't do anything
			// TODO: handling for custom actions
			client.rcon.rconCommandGuild(`/sc game.ban_player("${report.playername}", "${reason}")`, guildConfig.guildId)
		})
		
	}

}

export const guildConfigChanged = async ({ client, event }: HandlerOpts<"guildConfigChanged">) => {
	const oldConfig = client.guildConfigs.get(event.guildId)

	// TODO: perform an action

	client.guildConfigs.set(event.guildId, event)

}