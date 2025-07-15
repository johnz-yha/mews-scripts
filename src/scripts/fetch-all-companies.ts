import { sleep } from "bun";
import { ApiError, CompaniesService } from "../client";
import { writeToCSV } from "../utils/utils";

interface Params {
	count?: number;
	enterpriseId?: string;
}

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

// Fetch all companies with pagination
async function getAllCompanies({ count = 100 }: Params = {}) {
	const data = [];
	let hasMore = true;
	let cursor = undefined;
	let pageCount = 0;

	console.log(
		`Starting to fetch companies with ${count} records per page...`
	);

	while (hasMore) {
		pageCount++;
		try {
			console.log(`Fetching page ${pageCount}...`);

			const res = await CompaniesService.companiesGetAll({
				requestBody: {
					AccessToken: process.env.ACCESS_TOKEN!,
					ClientToken: process.env.CLIENT_TOKEN!,
					Client: process.env.CLIENT!,
					Limitation: { Count: count, Cursor: cursor },
				},
			});

			cursor = res?.Cursor ? res.Cursor : undefined;
			hasMore = cursor ? true : false;

			if (res?.Companies?.length) {
				data.push(...res.Companies);
				console.log(
					`Page ${pageCount}: Fetched ${res.Companies.length} companies (Total: ${data.length})`
				);
			} else {
				console.log(`Page ${pageCount}: No companies returned`);
			}

			// Add a small delay to be respectful to the API
			if (hasMore) {
				await sleep(250);
			}
		} catch (e) {
			if (e instanceof ApiError) {
				const error = e as ApiError;
				console.error("API Error:", error.body);
			} else {
				console.error("Unexpected error:", e);
			}
			throw new Error("Error in fetching Companies");
		}
	}

	console.log(
		`✅ Successfully fetched ${data.length} companies in ${pageCount} pages`
	);
	return data;
}

// Main function
async function main(): Promise<void> {
	try {
		// Validate environment variables
		validateEnvironment();

		console.log("🚀 Starting company data fetch...");

		// Fetch all companies
		const companies = await getAllCompanies({ count: 100 });

		// Display summary
		console.log("\n📊 Company Summary:");
		console.log(`Total Companies: ${companies.length}`);

		// Show some sample companies
		if (companies.length > 0) {
			console.log("\n📋 Sample Companies:");
			companies.slice(0, 5).forEach((company, index) => {
				console.log(
					`${index + 1}. ${company.Name} (ID: ${company.Id})`
				);
			});

			if (companies.length > 5) {
				console.log(`... and ${companies.length - 5} more companies`);
			}
		}

		// Save to JSON file
		const jsonFilename = `companies-${
			new Date().toISOString().split("T")[0]
		}-${process.env.NODE_ENV}`;
		await Bun.write(
			`./output/${jsonFilename}.json`,
			JSON.stringify(companies, null, 2)
		);
		console.log(`\n💾 Saved JSON data to: output/${jsonFilename}.json`);

		// Save to CSV file
		const csvFilename = `companies-${
			new Date().toISOString().split("T")[0]
		}-${process.env.NODE_ENV}`;
		await writeToCSV(companies, csvFilename);
		console.log(`💾 Saved CSV data to: output/${csvFilename}.csv`);

		// Display some statistics
		const activeCompanies = companies.filter((c) => c.IsActive);
		const inactiveCompanies = companies.filter((c) => !c.IsActive);

		console.log("\n📈 Statistics:");
		console.log(`Active Companies: ${activeCompanies.length}`);
		console.log(`Inactive Companies: ${inactiveCompanies.length}`);
		console.log(
			`Companies with Website: ${
				companies.filter((c) => c.WebsiteUrl).length
			}`
		);
		console.log(
			`Companies with Email: ${
				companies.filter((c) => c.InvoicingEmail).length
			}`
		);
		console.log(
			`Companies with Tax ID: ${
				companies.filter((c) => c.TaxIdentifier).length
			}`
		);

		console.log("\n✅ Company data fetch completed successfully!");
	} catch (error) {
		console.error("❌ Error in main function:", error);
		process.exit(1);
	}
}

// Run the script
main();
