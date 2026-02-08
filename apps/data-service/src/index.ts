import { App } from '@/hono/app';
import { WorkerEntrypoint } from 'cloudflare:workers';

export default class DataService extends WorkerEntrypoint<Env> {
	fetch(request: Request) {
		return App.fetch(request, this.env, this.ctx);
	}
}
