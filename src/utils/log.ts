import mung from "./mung"
import LogSchema from "../database/fagc/log"
import express from "express"

// https://stackoverflow.com/questions/19215042/express-logging-response-body

export default mung.json(function(body: any, req: express.Request) {
	if (req.method === "GET") return
	let ip = 
		Array.isArray(req.headers["x-forwarded-for"])
		? req.headers["x-forwarded-for"][0]
		: req.headers["x-forwarded-for"]
		|| req.socket.remoteAddress
	if (ip.includes(":") && ip !== "::1") ip = ip.slice(0, ip.indexOf(":"))
	LogSchema.create({
		timestamp: new Date(),
		apikey: req.headers.apikey as string,
		ip: ip,
		responseBody: body,
		requestBody: req.body,
		endpointAddress: req.originalUrl
	})
})