import { sleep } from "bun";
import Papa from "papaparse";
import { join } from "path";
import { ApiError, ReservationsService } from "../client";
import { writeToCSV } from "../utils/utils";

// Configuration
const INPUT_FILENAME = "sf-reservations-export.csv";
const INPUT_CSV_PATH = join(process.cwd(), "input", INPUT_FILENAME);
const OUTPUT_DIR = join(process.cwd(), "output", "reservations-by-ids");

// Validate environment variables
function validateEnvironment(): void {
	const requiredEnvVars = {
		ACCESS_TOKEN: process.env.ACCESS_TOKEN,
		CLIENT_TOKEN: process.env.CLIENT_TOKEN,
		CLIENT: process.env.CLIENT,
	};

	const missingVars = Object.entries(requiredEnvVars)
		.filter(([_, value]) => !value)
		.map(([key]) => key);

	if (missingVars.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missingVars.join(", ")}`
		);
	}
}

// Read and parse the CSV file
async function readCSV(filePath: string): Promise<any[]> {
	console.log(`Reading CSV file: ${filePath}`);

	const csvString = await Bun.file(filePath).text();

	const result = Papa.parse(csvString, {
		header: true,
		skipEmptyLines: true,
	});

	console.log(`Parsed ${result.data.length} records`);
	return result.data as any[];
}

// Extract reservation IDs from CSV records
function extractReservationIds(records: any[]): string[] {
	console.log("Extracting reservation IDs from CSV...");

	const reservationIds: string[] = [];

	for (const record of records) {
		const reservationId = record["Mews_Id__c"];

		if (!reservationId) {
			console.warn("Record missing Mews Id:", record);
			continue;
		}

		reservationIds.push(reservationId);
	}

	console.log(`Extracted ${reservationIds.length} reservation IDs`);
	return reservationIds;
}

// Fetch reservations by IDs
async function fetchReservationsByIds(
	reservationIds: string[],
	chunkSize: number = 100
): Promise<any[]> {
	console.log(`Fetching ${reservationIds.length} reservations...`);

	const allReservations: any[] = [];

	// Split reservation IDs into chunks to avoid API limits
	const chunks = [];
	for (let i = 0; i < reservationIds.length; i += chunkSize) {
		chunks.push(reservationIds.slice(i, i + chunkSize));
	}

	console.log(
		`Processing ${reservationIds.length} reservations in ${chunks.length} chunks of ${chunkSize}`
	);

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		console.log(
			`Processing chunk ${i + 1}/${chunks.length} with ${
				chunk.length
			} reservation IDs`
		);

		try {
			const response =
				await ReservationsService.reservationsGetAll20230606({
					// @ts-ignore
					requestBody: {
						AccessToken: process.env.ACCESS_TOKEN!,
						ClientToken: process.env.CLIENT_TOKEN!,
						Client: process.env.CLIENT!,
						Limitation: { Count: chunk.length },
						ReservationIds: chunk,
						// ServiceIds: [], // Empty array means all bookable services
					},
				});

			if (response?.Reservations?.length) {
				allReservations.push(...response.Reservations);
				console.log(
					`Chunk ${i + 1}: Fetched ${
						response.Reservations.length
					} reservations`
				);
			} else {
				console.log(`Chunk ${i + 1}: No reservations found`);
			}

			// Add delay between chunks to be respectful to the API
		} catch (e) {
			if (e instanceof ApiError) {
				const error = e as ApiError;
				console.error(`API Error in chunk ${i + 1}:`, error.body);
			} else {
				console.error(`Unexpected error in chunk ${i + 1}:`, e);
			}
			// Continue with next chunk instead of failing completely
		}

		await sleep(1000);
	}

	console.log(
		`✅ Successfully fetched ${allReservations.length} reservations`
	);
	return allReservations;
}

// Main function
async function main(): Promise<void> {
	try {
		// Validate environment variables
		validateEnvironment();

		// Ensure output directory exists
		try {
			await Bun.file(OUTPUT_DIR).exists();
		} catch {
			// Directory doesn't exist, create it
			await Bun.write(OUTPUT_DIR, "");
		}

		console.log("🚀 Starting reservation fetch by IDs...");

		// Read the CSV file
		const records = await readCSV(INPUT_CSV_PATH);

		// Extract reservation IDs
		const reservationIds = extractReservationIds(records);

		// Display summary
		console.log("\n📊 Input Summary:");
		console.log(`Total Records: ${records.length}`);
		console.log(`Reservation IDs to fetch: ${reservationIds.length}`);

		// Fetch reservations
		const allReservations = await fetchReservationsByIds(
			reservationIds,
			1000
		);

		// Display results summary
		console.log("\n📊 Results Summary:");
		console.log(`Total Reservations Fetched: ${allReservations.length}`);

		if (allReservations.length > 0) {
			console.log("\n📋 Sample Reservations:");
			allReservations.slice(0, 5).forEach((reservation, index) => {
				console.log(
					`${index + 1}. Reservation ${reservation.Number} (ID: ${
						reservation.Id
					}) - State: ${reservation.State}`
				);
			});

			if (allReservations.length > 5) {
				console.log(
					`... and ${allReservations.length - 5} more reservations`
				);
			}
		}

		// Save to JSON file
		const jsonFilename = `reservations-by-ids-${
			new Date().toISOString().split("T")[0]
		}-${process.env.NODE_ENV}`;
		await Bun.write(
			`./output/${jsonFilename}.json`,
			JSON.stringify(allReservations, null, 2)
		);
		console.log(`\n💾 Saved JSON data to: output/${jsonFilename}.json`);

		// Save to CSV file
		const csvFilename = `reservations-by-ids-${
			new Date().toISOString().split("T")[0]
		}-${process.env.NODE_ENV}`;
		await writeToCSV(allReservations, csvFilename);
		console.log(`💾 Saved CSV data to: output/${csvFilename}.csv`);

		// Display statistics
		const confirmedReservations = allReservations.filter(
			(r) => r.State === "Confirmed"
		);
		const startedReservations = allReservations.filter(
			(r) => r.State === "Started"
		);
		const processedReservations = allReservations.filter(
			(r) => r.State === "Processed"
		);
		const cancelledReservations = allReservations.filter(
			(r) => r.State === "Cancelled"
		);

		console.log("\n📈 Statistics:");
		console.log(`Confirmed Reservations: ${confirmedReservations.length}`);
		console.log(`Started Reservations: ${startedReservations.length}`);
		console.log(`Processed Reservations: ${processedReservations.length}`);
		console.log(`Cancelled Reservations: ${cancelledReservations.length}`);
		console.log(
			`Other States: ${
				allReservations.length -
				confirmedReservations.length -
				startedReservations.length -
				processedReservations.length -
				cancelledReservations.length
			}`
		);

		console.log("\n✅ Reservation fetch completed successfully!");
	} catch (error) {
		console.error("❌ Error in main function:", error);
		process.exit(1);
	}
}

// Run the script
main();
