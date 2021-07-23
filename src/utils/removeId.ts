import { FastifyReply, FastifyRequest } from "fastify"
// remove the _id property from everything using recursion magic

export default async function (
	_req: FastifyRequest,
	_res: FastifyReply,
	payload: unknown
) {
	const editResponse = (response: any) => {
		const removeable = ["_id", "__v", "apikey"]
		if (response && response.toObject) response = response.toObject()
		for (const prop in response) {
			if (removeable.includes(prop)) {
				delete response[prop]
			} else {
				if (response[prop]) {
					if (response[prop].toObject) response[prop] = response[prop].toObject()
					if (Array.isArray(response[prop])) response[prop] = editResponse(response[prop])
					if (typeof (response[prop]) == "object") response[prop] = editResponse(response[prop])
				}
			}
		}
		return response
	}

	// most responses are JSON so this should go through
	if (typeof payload === "string") {
		try {
			const newPayload = editResponse(JSON.parse(payload))
			return JSON.stringify(newPayload)
		} catch (e) {
			const newPayload = editResponse(payload)
			return newPayload
		}
	}
	try {
		const newPayload = editResponse(payload)
		return JSON.stringify(newPayload)
	} catch (e) {
		return payload
	}
}