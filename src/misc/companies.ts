import { CompaniesService } from "../client";

const companies = await CompaniesService.companiesGetAll({
	requestBody: {
		AccessToken: process.env.ACCESS_TOKEN!,
		ClientToken: process.env.CLIENT_TOKEN!,
		Client: process.env.CLIENT!,
		Limitation: {
			Count: 100,
		},
	},
});

console.log(
	"companies: ",
	companies.Companies.map((c) => c.Name)
);
