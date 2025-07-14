import { ApiError, ReservationsService } from "../client";

interface Params {
	count?: number;
	enterpriseId: string;
	serviceId: string;
	startUtc: string;
	endUtc: string;
}

export async function getAllReservations({
	count = 500,
	enterpriseId,
	startUtc,
	endUtc,
	serviceId,
}: Params) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;

	while (hasMore) {
		try {
			const res = await ReservationsService.reservationsGetAll20230606({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
					Limitation: { Count: count, Cursor: cursor },
					EnterpriseIds: [enterpriseId],
					CollidingUtc: {
						StartUtc: startUtc,
						EndUtc: endUtc,
					},
					ServiceIds: [serviceId],
					States: ["Started", "Processed"],
				},
			});

			cursor = res?.Cursor ? res.Cursor : undefined;
			// hasMore = cursor ? true : false;
			hasMore = res?.Reservations?.length < count ? false : true;
			res?.Reservations?.length && data.push(...res.Reservations);
			console.log(res?.Reservations?.length, cursor);
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
