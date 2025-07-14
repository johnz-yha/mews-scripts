import {
	type Configuration,
	type TaxEnvironmentResult,
	type TaxRate,
	type TaxationResult,
	TaxesService,
} from "../client";
import { withCache } from "../utils/withCache";

export async function getTaxValues(
	configuration: Configuration
): Promise<TaxRate[] | undefined> {
	const countryCode = configuration.Enterprise?.TaxEnvironmentCode;
	console.log("countryCode: ", countryCode);

	if (!countryCode) {
		throw new Error("Country code not found in configuration");
	}

	const taxEnvironments: TaxEnvironmentResult = await withCache(
		["taxEnvironmentsGetAll", process.env.NODE_ENV!],
		() =>
			TaxesService.taxEnvironmentsGetAll({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
				},
			})
	);

	const auTaxEnv = taxEnvironments?.TaxEnvironments?.filter(
		// (t) => t.CountryCode === "AUD"
		(t) => t.CountryCode === countryCode
	);

	// console.log("auTaxEnv: ", auTaxEnv);

	const taxations: TaxationResult = await withCache(
		["taxationsGetAll", process.env.NODE_ENV!],
		() =>
			TaxesService.taxationsGetAll({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
				},
			})
	);

	const auTaxes = taxations?.TaxRates?.filter(
		// (t) => t.TaxationCode === auTaxEnv?.TaxationCodes?.[0]
		(t) => t.TaxationCode?.startsWith(countryCode)
	);

	// console.log("auTaxes: ", auTaxes);
	return auTaxes;
}
