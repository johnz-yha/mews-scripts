import { ApiError, ResourceCategoriesService } from "../../client";

interface Params {
	count?: number;
	enterpriseId: string;
	serviceId: string;
}

export async function getAllResourceCategories({
	count = 100,
	enterpriseId,
	serviceId,
}: Params) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;

	while (hasMore) {
		try {
			const res =
				await ResourceCategoriesService.resourceCategoriesGetAll({
					requestBody: {
						AccessToken: process.env.ACCESS_TOKEN!,
						ClientToken: process.env.CLIENT_TOKEN!,
						Client: process.env.CLIENT!,
						ActivityStates: ["Active", "Deleted"],
						Limitation: { Count: count, Cursor: cursor },
						EnterpriseIds: [enterpriseId],
						ServiceIds: [serviceId],
					},
				});

			cursor = res?.Cursor ? res.Cursor : undefined;
			hasMore = cursor ? true : false;
			res?.ResourceCategories?.length &&
				data.push(...res.ResourceCategories);
			console.log(res?.ResourceCategories?.length, cursor);
		} catch (e) {
			if (e instanceof ApiError) {
				const error = e as ApiError;
				console.log("error: ", error.body);
			} else {
				console.log(e);
			}
			throw new Error("Error in fetching Accounting Categories");
		}
	}

	return data;
}
