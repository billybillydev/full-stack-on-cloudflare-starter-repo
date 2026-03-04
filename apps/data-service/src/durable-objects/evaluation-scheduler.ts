import { Dat } from '@mosidev/dat';
import { DurableObject } from 'cloudflare:workers';

type ClickData = {
	accountId: string;
	linkId: string;
	destinationUrl: string;
	destinationCountryCode: string;
}
export class EvaluationScheduler extends DurableObject {
	clickData: ClickData | undefined;
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			this.clickData = await ctx.storage.get('click_data');
		});
	}

	async collectLinkClick(data: ClickData) {
		this.clickData = data;

		await this.ctx.storage.put('click_data', this.clickData);

		const alarm = await this.ctx.storage.getAlarm();
		if (!alarm) {
			const tenSeconds = new Dat().addSeconds(10).valueOf();
			await this.ctx.storage.setAlarm(tenSeconds);
		}
	}

	async alarm() {
		console.log('Evaluation scheduler alarm triggered');

		const clickData = this.clickData;

		if (!clickData) throw new Error('Click data not set');

		await this.env.DESTINATION_EVALUATION_WORKFLOW.create({
			params: {
				linkId: clickData.linkId,
				accountId: clickData.accountId,
				destinationUrl: clickData.destinationUrl,
			},
		});
	}
}
