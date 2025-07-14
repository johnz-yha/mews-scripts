import {
	AgeCategoriesService,
	ServicesService,
	type AgeCategoriesGetAllResponse,
	type ServicesGetAllResponse,
} from "../client";
import { withCache } from "../utils/withCache";
import { withError } from "../utils/withError";

import Papa from "papaparse";

const servicesResponse: ServicesGetAllResponse = await withCache(
	[process.env.NODE_ENV ?? "development", "ServicesGetAll"],
	() =>
		ServicesService.servicesGetAll({
			requestBody: {
				AccessToken: process.env.ACCESS_TOKEN!,
				ClientToken: process.env.CLIENT_TOKEN!,
				Client: process.env.CLIENT!,
				Limitation: {
					Count: 500,
				},
			},
		})
);

// const stayServices = servicesResponse.Services?.filter(
// 	(s) => s.Name === "Stay"
// )!;
const stayServices = servicesResponse.Services!;

Bun.write("stayServices.json", JSON.stringify(stayServices));

const stayServicesIds = stayServices.map((s) => s.Id) as string[];

console.log("stayServicesIds: ", stayServicesIds);

const ageCategoriesResponse: AgeCategoriesGetAllResponse = await withError(() =>
	AgeCategoriesService.ageCategoriesGetAll({
		requestBody: {
			AccessToken: process.env.ACCESS_TOKEN!,
			ClientToken: process.env.CLIENT_TOKEN!,
			Client: process.env.CLIENT!,
			Limitation: {
				Count: 500,
			},
			ServiceIds: stayServicesIds,
			ActivityStates: ["Active", "Deleted"],
		},
	})
);
// console.log("ageCategoriesResponse: ", ageCategoriesResponse);

Bun.write("ageCategoriesGetAll.json", JSON.stringify(ageCategoriesResponse));

// Get a mapping of service ID to Age category ID to Name
const result = ageCategoriesResponse.AgeCategories?.map((ac) => ({
	EnterpriseId: stayServices.find((s) => s.Id === ac.ServiceId)!.EnterpriseId,
	ServiceId: ac.ServiceId,
	AgeCategoryId: ac.Id,
	Name: ac.Names["en-US"],
	MinimalAge: ac.MinimalAge,
	MaximalAge: ac.MaximalAge,
	ShortName: ac.ShortNames!["en-US"],
	// @ts-ignore
	Classification: ac.Classification,
}))!;

const csv = Papa.unparse(result, {
	skipEmptyLines: true,
	header: true,
});

Bun.write("ageCategories.csv", csv);
