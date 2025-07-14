import { CustomersService, type CustomersAddResponse } from "../client";
import { withError } from "../utils/withError";

for (let idx = 0; idx < 5; idx++) {
	const firstName = `Luke-${idx}`;
	const lastName = `Skywalker-${idx}`;

	const createCustomerResponse: CustomersAddResponse = await withError(() =>
		CustomersService.customersAdd({
			requestBody: {
				AccessToken: process.env.ACCESS_TOKEN!,
				ClientToken: process.env.CLIENT_TOKEN!,
				Client: process.env.CLIENT!,
				ChainId: process.env.CHAIN_ID!,
				OverwriteExisting: true,
				FirstName: firstName,
				LastName: lastName,
				Email: `luke.skywalker${idx}.${new Date().getTime()}@example.com`,
			},
		})
	);

	if (createCustomerResponse && createCustomerResponse?.Id) {
		console.log("createCustomerResponse: ", createCustomerResponse?.Id);
	} else {
		console.log("Failed to create: ", firstName, lastName);
	}
}
