const fetch = require("node-fetch")
const { apiurl } = require("../../config.json")


module.exports = {
    config: {
        name: "removewebhook",
        aliases: [],
        usage: "<webhook ID> <webhook token>",
        category: "informatics",
        description: "Removes a webhook from recieving FAGC notifications",
        accessibility: "Moderator",
    },
    run: async (client, message, args) => {
        if (!args[0]) return message.reply("Provide a Webhook ID")
        if (!args[1]) return message.reply("Provide a Webhook token")
        message.delete()
        message.reply("Message removed to prevent unauthorized webhook access")
        const webRaw = await fetch(`${apiurl}/informatics/removewebhook`, {
            method: "DELETE",
            body: JSON.stringify({
                id: args[0],
                token: args[1],
                guildid: message.guild.id
            }),
            headers: { 'content-type': 'application/json' }
        })
        const webhook = await webRaw.json();
        if (webhook._id)
            return message.reply(`The webhook will no longer be recieving FAGC notifications!`)
        else {
            console.error(webhook, Date.now())
            return message.reply("Error removing webhook")
        }
    },
};
