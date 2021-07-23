import { getModelForClass, modelOptions, prop} from "@typegoose/typegoose"
import database from "../database"

const connection = database.connections.find((connection) => connection?.n === "bot")?.c

// the thing from https://github.com/oof2win2/fagc-discord-bot/blob/dev/src/database/schemas/config.js

@modelOptions({
	schemaOptions: {
		collection: "configs"
	},
	existingMongoose: connection
})
export class ConfigClass {
	@prop({ required: true })
	communityname!: string

	@prop()
	communityId?: string

	@prop()
	guildId!: string

	@prop({ required: true })
	contact!: string

	@prop()
	apikey?: string

	@prop()
	moderatorRoleId!: string

	@prop({ type: [String] })
	trustedCommunities?: [string]

	@prop({ type: [String] })
	ruleFilters?: [string]
}

const CommunityConfigModel = getModelForClass(ConfigClass)
export default CommunityConfigModel