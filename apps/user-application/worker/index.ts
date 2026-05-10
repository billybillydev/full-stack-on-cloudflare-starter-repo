import { App } from "@/worker/hono/app";
import { initDatabase } from '@repo/data-ops/database';

export default {
  fetch(request, env, ctx) {
    if (!env.DB) {
      throw new Error('DB binding is required');
    }
    initDatabase(env.DB)
    return App.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<ServiceBindings>;
