// Update reservations in chunks given an array of reservation IDs

import { sleep } from "bun";
import * as fs from "fs";
import Papa from "papaparse";
import * as path from "path";
import { ApiError, ReservationsService } from "../client";

// Read reservations from CSV file
const csvFilePath = path.join(
	process.cwd(),
	"input",
	"reservations-to-update.csv"
);
const csvContent = fs.readFileSync(csvFilePath, "utf-8");

// Parse CSV and group by enterprise ID
const records = Papa.parse(csvContent, {
	header: true,
	skipEmptyLines: true,
}).data;

// Group reservations by enterprise ID
const reservationsByEnterprise: { [enterpriseId: string]: string[] } = {};

for (const record of records as any[]) {
	const reservationId = record["Mews Id"];
	const enterpriseId = record["Property Mews Id"];

	if (reservationId && enterpriseId) {
		if (!reservationsByEnterprise[enterpriseId]) {
			reservationsByEnterprise[enterpriseId] = [];
		}
		reservationsByEnterprise[enterpriseId].push(reservationId);
	}
}

console.log("Found reservations for the following enterprises:");
for (const [enterpriseId, reservations] of Object.entries(
	reservationsByEnterprise
)) {
	console.log(
		`Enterprise ${enterpriseId}: ${reservations.length} reservations`
	);
}

// Process each enterprise
for (const [enterpriseId, reservationIds] of Object.entries(
	reservationsByEnterprise
)) {
	console.log(
		`\nProcessing enterprise ${enterpriseId} with ${reservationIds.length} reservations`
	);

	await updateReservationsInChunks({
		reservationIds,
		enterpriseId,
		chunkSize: 100,
		dryRun: false,
	});
}

//
// HELPER FUNCTIONS

async function updateReservationsInChunks({
	reservationIds,
	enterpriseId,
	chunkSize,
	dryRun = true,
}: {
	reservationIds: string[];
	enterpriseId: string;
	chunkSize: number;
	dryRun: boolean;
}) {
	// Split reservation IDs into chunks
	const chunks = [];
	for (let i = 0; i < reservationIds.length; i += chunkSize) {
		chunks.push(reservationIds.slice(i, i + chunkSize));
	}

	console.log(
		`Processing ${reservationIds.length} reservations in ${chunks.length} chunks of ${chunkSize}`
	);

	let totalToUpdate = 0;
	let totalUpdated = 0;

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		console.log(
			`Processing chunk ${i + 1}/${chunks.length} with ${
				chunk.length
			} reservations`
		);

		const results = await updateReservationChunk({
			reservationIds: chunk,
			enterpriseId,
			dryRun,
		});

		totalToUpdate += results?.totalToUpdate ?? 0;
		totalUpdated += results?.totalUpdated ?? 0;

		console.log("sleeping for 20 seconds...");
		await sleep(20_000);
	}

	console.log("totalToUpdate: ", totalToUpdate);
	console.log("totalUpdated: ", totalUpdated);
}

async function updateReservationChunk({
	reservationIds,
	enterpriseId,
	dryRun = true,
}: {
	reservationIds: string[];
	enterpriseId: string;
	dryRun: boolean;
}) {
	console.log("no. of reservations to update: ", reservationIds.length);
	// console.log("reservationIds to Update: ", reservationIds);

	const totalToUpdate = reservationIds.length;
	let totalUpdated = 0;

	// Convert reservation IDs to the format expected by the update function
	const reservationUpdates = reservationIds.map((id) => ({
		ReservationId: id,
	}));

	// TODO: Do the updates
	if (!dryRun) {
		const nUpdated = await updateReservations(
			reservationUpdates,
			enterpriseId
		);
		totalUpdated += nUpdated ?? 0;
	} else {
		// console.log("DRY RUN - Would update reservations:", reservationIds);
	}

	console.log("totalToUpdate: ", totalToUpdate);
	console.log("totalUpdated: ", totalUpdated);

	return { totalToUpdate, totalUpdated };
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
				Reason: "Salesforce backfill - Travel Agency",
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
