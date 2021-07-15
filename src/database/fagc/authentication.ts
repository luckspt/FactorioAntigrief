import { getModelForClass, modelOptions, pre, prop, Ref } from "@typegoose/typegoose"
import database from "../database"
import { CommunityClass } from "./community"

// const connection = database.connections.find((connection) => connection.n === "fagc").c

@modelOptions({
	schemaOptions: {
		collection: "authentication"
	}
})
export class AuthClass {
	@prop({ ref: () => CommunityClass })
	communityId: Ref<CommunityClass>

	@prop()
	api_key!: string

	@prop({ default: [] })
	allowed_ips!: string[]
}

const AuthSchema = getModelForClass(AuthClass)
export default AuthSchema