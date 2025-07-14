import { ResourcesService } from "../client";
import { writeToCSV } from "../utils/utils";

const enterpriseIds = ["94713c6c-cf82-4e24-a1c8-ad5c00343e66"];
const resourceIds = ["c82d2c4a-c851-45be-80cd-ad5c00393c86"];

const response = await ResourcesService.resourcesGetAll({
	requestBody: {
		AccessToken: process.env.ACCESS_TOKEN!,
		ClientToken: process.env.CLIENT_TOKEN!,
		Client: process.env.CLIENT!,
		Limitation: {
			Count: 1000,
			Cursor: undefined,
		},
		EnterpriseIds: enterpriseIds,
		ResourceIds: resourceIds,
	},
});

const resources = response?.Resources;
console.log("resources: ", resources);
const csvData: any[] | undefined = resources?.map((r) => ({
	...r,
	Data: JSON.stringify(r.Data),
	Descriptions: JSON.stringify(r.Descriptions),
	// @ts-ignore
	ExternalNames: JSON.stringify(r?.ExternalNames),
	// @ts-ignore
	Directions: JSON.stringify(r?.Directions),
}));

console.log("csv: ", csvData);

if (!csvData) {
	console.log("No data to write to CSV");
} else {
	await writeToCSV(csvData, "resources");
}

// Update ExternalName of a resource
// try {
// 	const updateResponse = await ResourcesService.resourcesUpdate({
// 		requestBody: {
// 			AccessToken: process.env.ACCESS_TOKEN!,
// 			ClientToken: process.env.CLIENT_TOKEN!,
// 			Client: process.env.CLIENT!,
// 			ResourceUpdates: [
// 				{
// 					ResourceId: resourceIds[0],
// 					// EnterpriseId: "94713c6c-cf82-4e24-a1c8-ad5c00343e66",
// 					// @ts-ignore
// 					// ExternalName: {
// 					// 	Value: "Updated External Name",
// 					// },
// 					// Data: resources?.[0]?.Data,
// 				},
// 			],
// 		},
// 	});

// 	console.log("updateResponse: ", updateResponse);
// } catch (e) {
// 	if (e instanceof ApiError) {
// 		const error = e as ApiError;
// 		console.log("error: ", error.body);
// 	} else {
// 		console.log(e);
// 	}
// 	throw new Error("Error in updating resource");
// }
