import { getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';
import { Hono } from 'hono';

export const App = new Hono<{ Bindings: Env }>();

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
			timestamp: new Date().toISOString(),
		},
	};
	ctx.executionCtx.waitUntil(ctx.env.QUEUE.send(queueMessage));

	return ctx.redirect(destination);
});
