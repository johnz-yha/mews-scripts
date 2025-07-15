import { ApiError, ServicesService } from "../../client";

interface Params {
	count?: number;
	enterpriseId: string;
}

export async function getAllServices({ count = 100, enterpriseId }: Params) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;

	while (hasMore) {
		try {
			const res = await ServicesService.servicesGetAll({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
					Limitation: { Count: count, Cursor: cursor },
					EnterpriseIds: [enterpriseId],
				},
			});

			cursor = res?.Cursor ? res.Cursor : undefined;
			hasMore = cursor ? true : false;
			res?.Services?.length && data.push(...res.Services);
			console.log(res?.Services?.length, cursor);
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
