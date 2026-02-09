import { LinkSchemaType } from '@repo/data-ops/zod-schema/links';

export function getDestinationForCountry(linkInfo: LinkSchemaType, countryCode?: string) {
	if (!countryCode || !linkInfo.destinations[countryCode]) {
		return linkInfo.destinations.default;
	}

	return linkInfo.destinations[countryCode];
}
