import { Hono } from "hono";

export const App = new Hono<{ Bindings: Env }>();

App.get("/:id", (ctx) => {
	if (!ctx.req.raw.cf) {
		throw new Error('CF object is not available in the request context.');
	}

	const { country, latitude, longitude } = ctx.req.raw.cf;

	return ctx.json({ country, latitude, longitude });
});