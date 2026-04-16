import { captureLinkClickInBackground, getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';
import { Dat } from '@mosidev/dat';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';
import { Hono } from 'hono';

export const App = new Hono<{ Bindings: Env }>();

App.get('/click-socket', async (c) => {
	const upgradeHeader = c.req.header('Upgrade');
	if (!upgradeHeader || upgradeHeader !== 'websocket') {
		return c.text('Expected Upgrade: websocket', 426);
	}

	const accountId = c.req.header('account-id');
	if (!accountId) return c.text('No Headers', 404);
	const doId = c.env.LINK_CLICK_TRACKER_OBJECT.idFromName(accountId);
	const stub = c.env.LINK_CLICK_TRACKER_OBJECT.get(doId);
	return await stub.fetch(c.req.raw);
});

App.get('/:id', async (ctx) => {
	const id = ctx.req.param('id');
	const linkInfo = await getRoutingDestinations(ctx.env, id);

	if (!linkInfo) {
		return ctx.text('Destination not found', 404);
	}

	const cfHeader = cloudflareInfoSchema.safeParse(ctx.req.raw.cf);

	if (!cfHeader.success) {
		return ctx.text('Invalid Cloudflare header', 400);
	}

	const headers = cfHeader.data;
	const destination = getDestinationForCountry(linkInfo, headers.country);

	const queueMessage: LinkClickMessageType = {
		type: 'LINK_CLICK',
		data: {
			id: id,
			country: headers.country,
			destination: destination,
			accountId: linkInfo.accountId,
			latitude: headers.latitude,
			longitude: headers.longitude,
			timestamp: new Dat().toISOString(),
		},
	};
	ctx.executionCtx.waitUntil(captureLinkClickInBackground(ctx.env, queueMessage));

	return ctx.redirect(destination);
});
