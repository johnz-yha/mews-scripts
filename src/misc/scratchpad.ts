import { EnterprisesService } from "../client";

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
