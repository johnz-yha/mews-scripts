import Papa from "papaparse";
import { join } from "path";

// Configuration

const INPUT_FILENAME = "reservations-to-update-all.csv";
const INPUT_CSV_PATH = join(process.cwd(), "input", INPUT_FILENAME);
const OUTPUT_DIR = join(process.cwd(), "output", "reservations-by-property");

// Read and parse the CSV file
async function readCSV(filePath: string): Promise<any[]> {
	console.log(`Reading CSV file: ${filePath}`);

	const csvString = await Bun.file(INPUT_CSV_PATH).text();

	const result = Papa.parse(csvString, {
		header: true,
		skipEmptyLines: true,
	});

	console.log(`Parsed ${result.data.length} records`);
	return result.data as any[];
}

// Group records by Property Mews Id
function groupRecordsByPropertyId(records: any[]): {
	[propertyId: string]: any[];
} {
	console.log("Grouping records by Property Mews Id...");

	const grouped: { [propertyId: string]: any[] } = {};

	for (const record of records) {
		const propertyId = record["Property Mews Id"];

		if (!propertyId) {
			console.warn("Record missing Property Mews Id:", record);
			continue;
		}

		if (!grouped[propertyId]) {
			grouped[propertyId] = [];
		}

		grouped[propertyId].push(record);
	}

	console.log(`Grouped into ${Object.keys(grouped).length} property groups`);
	return grouped;
}

// Write a group to a CSV file
async function writeGroupToCSV(
	propertyId: string,
	records: any[],
	outputDir: string
): Promise<void> {
	const filename = `${propertyId}.csv`;
	const filePath = join(outputDir, filename);

	// Convert records back to CSV
	const csvContent = Papa.unparse(records);

	// Write to file using Bun
	await Bun.write(filePath, csvContent);

	console.log(`Written ${records.length} records to ${filename}`);
}

// Main function
async function main(): Promise<void> {
	// Ensure output directory exists
	try {
		await Bun.file(OUTPUT_DIR).exists();
	} catch {
		// Directory doesn't exist, create it
		await Bun.write(OUTPUT_DIR, "");
	}

	try {
		// Read the CSV file
		const records = await readCSV(INPUT_CSV_PATH);

		// Group records by Property Mews Id
		const groupedRecords = groupRecordsByPropertyId(records);

		// Write each group to a separate CSV file
		console.log("\nWriting grouped records to separate CSV files...");

		for (const [propertyId, groupRecords] of Object.entries(
			groupedRecords
		)) {
			await writeGroupToCSV(propertyId, groupRecords, OUTPUT_DIR);
		}

		console.log(
			`\n✅ Successfully processed ${records.length} records into ${
				Object.keys(groupedRecords).length
			} property-specific CSV files in the output directory.`
		);
	} catch (error) {
		console.error("❌ Error processing CSV:", error);
		process.exit(1);
	}
}

// Run the script
main();
