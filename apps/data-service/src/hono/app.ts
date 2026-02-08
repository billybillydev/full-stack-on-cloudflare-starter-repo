import { Hono } from "hono";

export const App = new Hono<{ Bindings: Env }>();

App.get("/:id", (c) => {
    return c.json({ message: "Hello World!" });
});