import { Mongoose } from "mongoose"
// const mongoose = require("mongoose")
// const mongodb = require("mongo-mock")
import config, { ApiConfig } from "../config"
import ENV from "../utils/env"

class ConnectionManager {
	connections: ({
		c: typeof import("mongoose")
		n: string
	} | undefined)[]
	constructor(config: ApiConfig) {
		this.connections = config.dbConnections.map((connectionConfig) => {
			try {
				let connection = new Mongoose()
				connection.connect(ENV.MONGOURI, connectionConfig).then(() => {
					console.log(`Database ${connectionConfig.dbName} connected!`)
				}).catch((e: unknown) => {
					console.error(`Database ${connectionConfig.dbName} errored: ${e}`)
				})
				return {
					c: connection,
					n: connectionConfig.dbName!
				}
			} catch (e) {
				console.error(`Database ${connectionConfig.dbName} errored: ${e}`)
			}
		})
	}
}
export default new ConnectionManager(config)