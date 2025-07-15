import { EnterprisesService } from "../client";

async function getAllEnterprises() {
	// Validate environment variables
	const requiredEnvVars = {
		ACCESS_TOKEN: process.env.ACCESS_TOKEN,
		CLIENT_TOKEN: process.env.CLIENT_TOKEN,
		CLIENT: process.env.CLIENT,
	};

	// Check for missing environment variables
	const missingVars = Object.entries(requiredEnvVars)
		.filter(([_, value]) => !value)
		.map(([key]) => key);

	if (missingVars.length > 0) {
		throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
	}

	try {
		const allEnterprises = await EnterprisesService.enterprisesGetAll({
			requestBody: {
				AccessToken: process.env.ACCESS_TOKEN!,
				ClientToken: process.env.CLIENT_TOKEN!,
				Client: process.env.CLIENT!,
				Limitation: {
					Count: 1000,
				},
			},
		});

		console.log(
			"allEnterprises",
			allEnterprises.Enterprises.map((e) => `${e.Id} - ${e.Name}`).join("\n")
		);

		return allEnterprises;
	} catch (error) {
		console.error('Failed to fetch enterprises:', error);
		throw error;
	}
}

export { getAllEnterprises };

