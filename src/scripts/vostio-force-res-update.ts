// Get list of reservations by Enterprise

import { addDays, toDate } from "date-fns";
import { ApiError, ReservationsService } from "../client";
// import { getAllEnterprises } from "../services/enterprises";

// const enterprises = await getAllEnterprises({});
// const enterpriseIds = enterprises.map((e) => e.Id);
// console.log("enterpriseIds: ", enterpriseIds);

// for (const enterpriseId of enterpriseIds) {
// 	console.log("enterpriseId: ", enterpriseId);
// 	const reservations = await getAndUpdateReservationsByCreatedUtc({
// 		count: 500,
// 		enterpriseId,
// 		startUtc: "2024-10-01T00:00:00Z",
// 		endUtc: "2024-12-31T23:59:59Z",
// 	});
// }

// SYDC Prod
const enterpriseId = "61f40fb2-4edc-46f8-b1b1-ad600045149d";

await updateReservationsInChunks({
	start: "2025-03-11T00:00:00Z",
	end: "2027-06-11T00:00:00Z",
	enterpriseId: enterpriseId,
	chunkSize: 90,
	dryRun: false,
});

//
// HELPER FUNCTIONS

async function updateReservationsInChunks({
	start,
	end,
	enterpriseId,
	chunkSize,
	dryRun = true,
}: {
	start: string;
	end: string;
	enterpriseId: string;
	chunkSize: number;
	dryRun: boolean;
}) {
	const startUtc = toDate(start);
	const endUtc = toDate(end);

	const chunks = [];
	let current = startUtc;

	while (current < endUtc) {
		const next = addDays(current, chunkSize);
		chunks.push({
			startUtc: current.toISOString(),
			endUtc: next < endUtc ? next.toISOString() : endUtc.toISOString(),
		});
		current = next;
	}

	console.log("chunks: ", chunks);

	let totalToUpdate = 0;
	let totalUpdated = 0;

	for (const chunk of chunks) {
		console.log("start: ", chunk.startUtc);
		console.log("end: ", chunk.endUtc);

		const results = await getAndUpdateReservationsByCreatedUtc({
			count: 500,
			enterpriseId,
			startUtc: chunk.startUtc,
			endUtc: chunk.endUtc,
			dryRun,
		});

		totalToUpdate += results?.totalToUpdate ?? 0;
		totalUpdated += results?.totalUpdated ?? 0;
	}

	console.log("totalToUpdate: ", totalToUpdate);
	console.log("totalUpdated: ", totalUpdated);
}

async function getAndUpdateReservationsByCreatedUtc({
	count = 500,
	enterpriseId,
	startUtc,
	endUtc,
	dryRun = true,
}: Params) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;

	let totalToUpdate = 0;
	let totalUpdated = 0;

	while (hasMore) {
		try {
			const res = await ReservationsService.reservationsGetAll20230606({
				// @ts-ignore
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
					Limitation: { Count: count, Cursor: cursor },
					EnterpriseIds: [enterpriseId],
					// @ts-ignore
					// CreatedUtc: {
					// 	StartUtc: startUtc,
					// 	EndUtc: endUtc,
					// },
					// UpdatedUtc: {
					// 	StartUtc: startUtc,
					// 	EndUtc: endUtc,
					// },
					ScheduledStartUtc: {
						StartUtc: startUtc,
						EndUtc: endUtc,
					},
					// ServiceIds: [""],
					States: ["Confirmed"],
				},
			});

			// Filter out checked-in and checked-out reservations
			let reservationsToUpdate = res.Reservations.filter(
				(r) => r.State !== "Started"
			).map((r) => ({
				ReservationId: r.Id,
			}));

			if (!reservationsToUpdate.length) {
				console.log("No reservations to update");
				return;
			}

			// Grab the first 10 reservationIds from reservationsToUpdate
			// reservationsToUpdate = reservationsToUpdate.slice(0, 10);

			console.log(
				"no. of reservations to update: ",
				reservationsToUpdate?.length
			);
			console.log(
				"reservationIds to Update: ",
				reservationsToUpdate.map((r) => r.ReservationId)
			);

			totalToUpdate += reservationsToUpdate.length;

			// TODO: Do the updates
			if (!dryRun) {
				const nUpdated = await updateReservations(
					reservationsToUpdate,
					enterpriseId
				);
				totalUpdated += nUpdated ?? 0;
			}

			cursor = res?.Cursor ? res.Cursor : undefined;
			// hasMore = cursor ? true : false;
			hasMore = res?.Reservations?.length < count ? false : true;
			res?.Reservations?.length && data.push(...res.Reservations);
			// console.log(res?.Reservations?.length, cursor);
		} catch (e) {
			if (e instanceof ApiError) {
				const error = e as ApiError;
				console.log("error: ", error.body);
			} else {
				console.log(e);
			}
			throw new Error("Error in fetching Reservations");
		}
	}

	console.log("totalToUpdate: ", totalToUpdate);
	console.log("totalUpdated: ", totalUpdated);

	return { totalToUpdate, totalUpdated };
}

interface Params {
	count?: number;
	enterpriseId: string;
	startUtc: string;
	endUtc: string;
	dryRun: boolean;
}

async function updateReservations(
	reservationUpdates: { ReservationId: string }[],
	enterpriseId: string
) {
	try {
		const updated = await ReservationsService.reservationsUpdate({
			requestBody: {
				AccessToken: process.env.ACCESS_TOKEN!,
				ClientToken: process.env.CLIENT_TOKEN!,
				Client: process.env.CLIENT!,
				EnterpriseId: enterpriseId,
				Reason: "Vostio Force Update",
				// @ts-ignore
				ReservationUpdates: reservationUpdates,
			},
		});
		console.log("updated: ", updated?.Reservations?.length);
		// console.log(
		// 	"updated Ids: ",
		// 	updated.Reservations?.map((r) => r.Id)
		// );
		console.log(
			"updated Ids: ",
			updated.Reservations?.map((r) => r.Id)
		);
		return updated.Reservations?.length;
	} catch (e) {
		console.log("Error in updating Reservations: ", e);
		if (e instanceof ApiError) {
			const error = e as ApiError;
			console.log("error: ", error.body);
		}
	}
}
