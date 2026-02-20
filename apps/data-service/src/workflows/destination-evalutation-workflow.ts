import { aiDestinationChecker } from '@/helpers/ai-destination-checker';
import { collectDestinationInfo } from '@/helpers/browser-render';
import { initDatabase } from '@repo/data-ops/database';
import { addEvaluation } from '@repo/data-ops/queries/evalutations';
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

export class DestinationEvaluationWorkflow extends WorkflowEntrypoint<Env, DestinationStatusEvaluationParams> {
	async run(event: Readonly<WorkflowEvent<DestinationStatusEvaluationParams>>, step: WorkflowStep) {
		initDatabase(this.env.DB);

		const collectedData = await step.do('Collect rendered destination page data', async () => {
			return collectDestinationInfo(this.env, event.payload.destinationUrl);
		});

		const { pageStatus } = await step.do(
			'Use AI to check status of page',
			{
				retries: {
					limit: 0,
					delay: 0,
				},
			},
			async () => {
				return await aiDestinationChecker(this.env, collectedData.bodyText);
			},
		);

		const evaluationId = await step.do('Save evaluation in database', async () => {
			return await addEvaluation({
				linkId: event.payload.linkId,
				status: pageStatus.status,
				reason: pageStatus.statusReason,
				accountId: event.payload.accountId,
				destinationUrl: event.payload.destinationUrl,
			});
		});
	}
}
