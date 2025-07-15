import { ApiError, ResourcesService } from "../../client";

interface Params {
	count?: number;
	// startUtc: string;
	// endUtc: string;
	enterpriseId: string;
}

export async function getAllResources({
	count = 500,
	// startUtc,
	// endUtc,
	enterpriseId,
}: Params) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;

	while (hasMore) {
		try {
			const res = await ResourcesService.resourcesGetAll({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
					Limitation: { Count: count, Cursor: cursor },
					EnterpriseIds: [enterpriseId],
					Extent: {
						Inactive: false,
						Resources: true,
					},
				},
			});

			cursor = res?.Cursor ? res.Cursor : undefined;
			hasMore = cursor ? true : false;
			console.log(`${res?.Resources?.length} ${cursor}`);
			res?.Resources?.length && data.push(...res.Resources);
		} catch (e) {
			if (e instanceof ApiError) {
				const error = e as ApiError;
				console.log("error: ", error.body);
			} else {
				console.log(e);
			}
			throw Error("Error fetching Order Items");
		}
	}

	return data;
}
