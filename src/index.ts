// Entry point

import { EnterprisesService } from "./client";
import "./init";

console.log("Environment: ", process.env.NODE_ENV);
console.log("Entry point: example script... in ./src/index.ts");

async function fetchAllEnterprises() {
	try {
		const result = await EnterprisesService.enterprisesGetAll({
			requestBody: {
				AccessToken: process.env.ACCESS_TOKEN!,
				ClientToken: process.env.CLIENT_TOKEN!,
				Client: process.env.CLIENT!,
				Limitation: { Count: 1000 },
			},
		});
		return result.Enterprises;
	} catch (error) {
		console.error("Failed to fetch enterprises:", error);
		throw error;
	}
}

// Example usage in main
async function main() {
	// ... existing code ...
	const enterprises = await fetchAllEnterprises();
	console.log(
		"Enterprises: ",
		enterprises.map((e) => e.Name)
	);
	// ... existing code ...
}

main();
