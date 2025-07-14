import { ApiError, ResourceCategoriesService } from "../client";

interface Params {
	count?: number;
	enterpriseId: string;
	resourceCategoryIds: string[];
}

export async function getAllResourceCategoryAssignments({
	count = 100,
	enterpriseId,
	resourceCategoryIds,
}: Params) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;

	while (hasMore) {
		try {
			const res =
				await ResourceCategoriesService.resourceCategoryAssignmentsGetAll(
					{
						requestBody: {
							AccessToken: process.env.ACCESS_TOKEN!,
							ClientToken: process.env.CLIENT_TOKEN!,
							Client: process.env.CLIENT!,
							ActivityStates: ["Active", "Deleted"],
							Limitation: { Count: count, Cursor: cursor },
							EnterpriseIds: [enterpriseId],
							ResourceCategoryIds: resourceCategoryIds,
						},
					}
				);

			cursor = res?.Cursor ? res.Cursor : undefined;
			hasMore = cursor ? true : false;
			res?.ResourceCategoryAssignments?.length &&
				data.push(...res.ResourceCategoryAssignments);
			console.log(res?.ResourceCategoryAssignments?.length, cursor);
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
