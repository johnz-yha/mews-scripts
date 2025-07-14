import {
	AgeCategoriesService,
	ServicesService,
	type AgeCategoriesGetAllResponse,
	type ServicesGetAllResponse,
} from "../client";
import { withCache } from "../utils/withCache";
import { withError } from "../utils/withError";

// Get Age Categories for all services and enterprises

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

const stayServices = servicesResponse.Services?.filter(
	(s) => s.Name === "Stay"
)!;

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
			ActivityStates: ["Active"],
		},
	})
);

console.log(
	"ageCategories Shortnames: ",
	// @ts-ignore
	ageCategoriesResponse.AgeCategories?.map((ac) => ac?.Classification)
);
