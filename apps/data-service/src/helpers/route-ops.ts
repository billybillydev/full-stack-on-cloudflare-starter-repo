import { Dat } from '@mosidev/dat';
import { getLink } from '@repo/data-ops/queries/links';
import { linkSchema, LinkSchemaType } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

export function getDestinationForCountry(linkInfo: LinkSchemaType, countryCode?: string) {
	if (!countryCode || !linkInfo.destinations[countryCode]) {
		return linkInfo.destinations.default;
	}

	return linkInfo.destinations[countryCode];
}

const TTL_TIME = 60 * 60 * 24; // 1 day

async function saveLinkInfoToKv(env: Env, id: string, linkInfo: LinkSchemaType) {
	try {
		await env.CACHE.put(id, JSON.stringify(linkInfo), {
			expirationTtl: TTL_TIME,
		});
	} catch (error) {
		console.error('Error saving link info to KV:', error);
	}
}

export async function getRoutingDestinations(env: Env, id: string) {
	const linkInfoFromKv = await getLinkInfoFromKv(env, id);
	if (linkInfoFromKv) return linkInfoFromKv;
	const linkInfoFromDb = await getLink(id);
	if (!linkInfoFromDb) return null;
	await saveLinkInfoToKv(env, id, linkInfoFromDb);
	return linkInfoFromDb;
}

async function getLinkInfoFromKv(env: Env, id: string) {
	const linkInfo = await env.CACHE.get(id);
	if (!linkInfo) return null;
	try {
		const parsedLinkInfo = JSON.parse(linkInfo);
		return linkSchema.parse(parsedLinkInfo);
	} catch (error) {
		return null;
	}
}

export async function scheduleEvalWorkflow(env: Env, event: LinkClickMessageType) {
	console.log('in scheduleEvalWorkflow', { data: event.data });
	const durableObjectId = env.EVALUATION_SCHEDULER.idFromName(`${event.data.id}:${event.data.destination}`);
	const stub = env.EVALUATION_SCHEDULER.get(durableObjectId);
	await stub.collectLinkClick({
		accountId: event.data.accountId,
		linkId: event.data.id,
		destinationUrl: event.data.destination,
		destinationCountryCode: event.data.country || 'UNKNOWN',
	});
}

export async function captureLinkClickInBackground(env: Env, event: LinkClickMessageType) {
	await env.QUEUE.send(event);

	const durableObjectId = env.LINK_CLICK_TRACKER_OBJECT.idFromName(event.data.accountId);
	const stub = env.LINK_CLICK_TRACKER_OBJECT.get(durableObjectId);

	if (!event.data.latitude || !event.data.longitude || !event.data.country) {
		return;
	}

	console.log('Capturing link click in background', event.data);

	await stub.addClick(
		event.data.latitude,
		event.data.longitude,
		event.data.country,
		Dat.now()
	);
}
