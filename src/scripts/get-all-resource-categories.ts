import {
	ApiError,
	EnterprisesService,
	ResourceCategoriesService,
	ResourcesService,
	ServicesService,
	type Resource,
	type ResourceCategoryAssignment,
} from "../client";
import { writeToCSV } from "../utils/utils";

const count = 1000;

const enterprises = await EnterprisesService.enterprisesGetAll({
	requestBody: {
		AccessToken: process.env.ACCESS_TOKEN!,
		ClientToken: process.env.CLIENT_TOKEN!,
		Client: process.env.CLIENT!,
		Limitation: {
			Count: 1000,
		},
	},
});

console.log("Enterprises: ", enterprises.Enterprises.length);

const services = await ServicesService.servicesGetAll({
	requestBody: {
		AccessToken: process.env.ACCESS_TOKEN!,
		ClientToken: process.env.CLIENT_TOKEN!,
		Client: process.env.CLIENT!,
		Limitation: {
			Count: 1000,
		},
	},
});

const stayServiceIds = services
	.Services!.filter((s) => s.Name === "Stay")
	.map((s) => s.Id) as string[];

console.log("Stay Services: ", services.Services!.length);

const resourceCatData: Resource[] = [];
let hasMore = true;
let cursor = undefined;

const resourceCategoryResponse =
	await ResourceCategoriesService.resourceCategoriesGetAll({
		requestBody: {
			AccessToken: process.env.ACCESS_TOKEN!,
			ClientToken: process.env.CLIENT_TOKEN!,
			Client: process.env.CLIENT!,
			Limitation: {
				Count: 1000,
			},
			ServiceIds: stayServiceIds,
			EnterpriseIds: enterprises.Enterprises.map((e) => e.Id),
		},
	});

const resourceCategoryIds = resourceCategoryResponse.ResourceCategories!.map(
	(rc) => rc.Id
) as string[];

console.log("Resource Categories: ", resourceCategoryIds.length);

console.log("Fetching Resource Category Assignments...");

const resourceCatAssignData: ResourceCategoryAssignment[] = [];
let hasMore2 = true;
let cursor2 = undefined;

while (hasMore2) {
	try {
		const res =
			await ResourceCategoriesService.resourceCategoryAssignmentsGetAll({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
					ActivityStates: ["Active", "Deleted"],
					Limitation: { Count: 1000, Cursor: cursor2 },
					EnterpriseIds: enterprises.Enterprises.map((e) => e.Id),
					ResourceCategoryIds: resourceCategoryIds,
				},
			});

		cursor2 = res?.Cursor ? res.Cursor : undefined;
		hasMore2 = cursor2 ? true : false;
		res?.ResourceCategoryAssignments?.length &&
			resourceCatAssignData.push(...res.ResourceCategoryAssignments);
		console.log(res?.ResourceCategoryAssignments?.length, cursor2);
	} catch (e) {
		if (e instanceof ApiError) {
			const error = e as ApiError;
			console.log("error: ", error.body);
		} else {
			console.log(e);
		}
		throw new Error("Error in fetching Resource Category Assignments");
	}
}

console.log("Assignments: ", resourceCatAssignData.length);

console.log("Fetching resources...");

const resourceData: Resource[] = [];
let hasMore3 = true;
let cursor3 = undefined;

while (hasMore3) {
	try {
		const res = await ResourcesService.resourcesGetAll({
			requestBody: {
				AccessToken: process.env.ACCESS_TOKEN!,
				ClientToken: process.env.CLIENT_TOKEN!,
				Client: process.env.CLIENT!,
				Limitation: { Count: 1000, Cursor: cursor3 },
				EnterpriseIds: enterprises.Enterprises.map((e) => e.Id),
			},
		});

		cursor3 = res?.Cursor ? res.Cursor : undefined;
		hasMore3 = cursor3 ? true : false;
		res?.Resources?.length && resourceData.push(...res.Resources);
		console.log(res?.Resources?.length, cursor3);
	} catch (e) {
		if (e instanceof ApiError) {
			const error = e as ApiError;
			console.log("error: ", error.body);
		} else {
			console.log(e);
		}
		throw new Error("Error in fetching Resources");
	}
}

console.log(resourceData.length);

const resourcesJoined = resourceData.map((resource) => {
	// Find the category assignment for this resource
	const assignment = resourceCatAssignData.find(
		(assignment) => assignment.ResourceId === resource.Id
	);

	// Find the category using the assignment's category ID
	const category = resourceCategoryResponse.ResourceCategories?.find(
		(category) => category.Id === assignment?.CategoryId
	);

	const enterpriseName = enterprises.Enterprises.find(
		(enterprise) => enterprise.Id === resource.EnterpriseId
	)?.Name;

	// if (!category?.Id) {
	// 	console.log(
	// 		`${enterpriseName} - resource doesn't have a category: ${resource.Name}`
	// 	);
	// }

	// Get the first available name from the category's Names object
	const categoryName = category?.Names
		? Object.entries(category.Names)[0][1]
		: "";

	// console.log("categoryName: ", categoryName);

	const externalName =
		resource?.ExternalNames?.["en-US"] ||
		resource?.ExternalNames?.["en-GB"];

	return {
		EnterpriseName: enterpriseName,
		...resource,
		ExternalName: externalName ?? "",
		Category: categoryName,
	};
});

// Convert nested objects to strings
const flattenedResources = resourcesJoined.map((resource) => {
	const flattened: Record<string, string> = {};
	Object.entries(resource).forEach(([key, value]) => {
		flattened[key] =
			typeof value === "object" ? JSON.stringify(value) : String(value);
	});
	return flattened;
});

console.log(flattenedResources.slice(0, 5));

await writeToCSV(flattenedResources, "resources-joined");

console.log(
	"resources with no category: ",
	resourcesJoined.filter((r) => r.Category === "").length
);
