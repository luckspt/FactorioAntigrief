const fetch = require("node-fetch")
const strictUriEncode = require("strict-uri-encode")
const { MessageEmbed } = require("discord.js")
const ConfigModel = require("../../database/schemas/config")
const Command = require("../../base/Command")

class GetViolations extends Command {
	constructor(client) {
		super(client, {
			name: "getfilteredviolations",
			description: "Gets violations of a player from only trusted communities and filtered rules",
			aliases: ["check", "getviolations"],
			category: "violations",
			usage: "[playername]",
			examples: ["{{p}}getfilteredviolations Windsinger"],
			dirname: __dirname,
			enabled: true,
			memberPermissions: [],
			botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
			ownerOnly: false,
			cooldown: 3000,
			requiredConfig: true
		})
	}
	async run(message, args) {
		if (!args[0]) return message.reply("Provide a player name to get violations of")
		const config = await ConfigModel.findOne({ guildid: message.guild.id })
		if (config.trustedCommunities === undefined) return message.reply("No filtered communities set")
		const violations = await fetch(`${this.client.config.apiurl}/violations/getall?playername=${strictUriEncode(args[0])}`).then(v => v.json())
		const communities = await fetch(`${this.client.config.apiurl}/communities/getall`).then(c => c.json())

		let embed = new MessageEmbed()
			.setTitle("FAGC Violations")
			.setColor("GREEN")
			.setTimestamp()
			.setAuthor("FAGC Community")
			.setDescription(`FAGC Violations of player \`${args[0]}\``)

		const trustedCommunities = communities.filter((community) => {
			if (config.trustedCommunities.some((trustedID) => { return trustedID === community.id })) return community
		})

		const CachedCommunities = new Map()
		const getOrFetchCommunity = async (communityid) => {
			if (CachedCommunities.get(communityid)) return CachedCommunities.get(communityid)
			const community = CachedCommunities.set(communityid, fetch(`${this.client.config.apiurl}/communities/getid?id=${strictUriEncode(communityid)}`).then(c => c.json())).get(communityid)
			return community
		}
		const CachedRules = new Map()
		const getOrFetchRule = async (ruleid) => {
			if (CachedRules.get(ruleid)) return CachedRules.get(ruleid)
			const rule = CachedRules.set(ruleid, fetch(`${this.client.config.apiurl}/rules/getid?id=${strictUriEncode(ruleid)}`).then((c) => c.json())).get(ruleid)
			return rule
		}

		let i = 0
		await Promise.all(violations.map(async (violation) => {
			if (i && i % 25) {
				message.channel.send(embed)
				embed.fields = []
			}
			if (trustedCommunities.some((community) => community.id === violation.communityid)) {
				const admin = await this.client.users.fetch(violation.admin_id)
				const rule = await getOrFetchRule(violation.broken_rule)
				const community = await getOrFetchCommunity(violation.communityid)
				embed.addField(violation.id,
					`By: <@${admin.id}> | ${admin.tag}\nCommunity ID: ${community.name} (${community.id})\n` +
					`Broken rule: ${rule.shortdesc} (${rule.id})\nProof: ${violation.proof}\n` +
					`Description: ${violation.description}\nAutomated: ${violation.automated}\n` +
					`Violated time: ${(new Date(violation.violated_time)).toUTCString()}`,
					true
				)
				i++
			}
		}))
		if (i == 0)
			return message.channel.send(`Player \`${args[0]}\` doesn't have violations that correspond to your rule and community preferences`)
		message.channel.send(embed)
	}
}
module.exports = GetViolations