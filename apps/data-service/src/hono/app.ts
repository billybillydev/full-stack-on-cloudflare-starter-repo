import { getLink } from "@repo/data-ops/queries/links";
import { Hono } from "hono";

export const App = new Hono<{ Bindings: Env }>();

App.get("/:id", async (ctx) => {
	if (!ctx.req.raw.cf) {
		throw new Error('CF object is not available in the request context.');
	}

    const id = ctx.req.param("id");
    const linkFromDb = await getLink(id);

	return ctx.json(linkFromDb);
});