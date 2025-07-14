const enterprisesProd = [
	{
		"YHA Location Name": "Adelaide Central YHA",
		"MEWS Enterprise Id": "9b804fff-4c31-4c36-8853-ad96008a27bc",
		"Time Zone": "Australia/Adelaide",
	},
	{
		"YHA Location Name": "Alice Springs YHA",
		"MEWS Enterprise Id": "fc7d49ec-8727-4d07-bb25-ad8f0054e97d",
		"Time Zone": "Australia/Darwin",
	},
	{
		"YHA Location Name": "Apollo Bay Eco YHA",
		"MEWS Enterprise Id": "b2c138ea-0799-4f04-95dd-adac000ef5c1",
		"Time Zone": "Australia/Melbourne",
	},
	{
		"YHA Location Name": "Blue Mountains YHA",
		"MEWS Enterprise Id": "3a00c3d8-68f0-4896-8aab-ad280094b1f4",
		"Time Zone": "Australia/Sydney",
	},
	{
		"YHA Location Name": "Brisbane City YHA",
		"MEWS Enterprise Id": "94713c6c-cf82-4e24-a1c8-ad5c00343e66",
		"Time Zone": "Australia/Brisbane",
	},
	{
		"YHA Location Name": "Byron Bay YHA",
		"MEWS Enterprise Id": "07e54a9e-e95e-401b-9d9d-ad520056d4c7",
		"Time Zone": "Australia/Sydney",
	},
	{
		"YHA Location Name": "Cairns Central YHA",
		"MEWS Enterprise Id": "6a2d59a9-2cf0-4e26-bed5-ad2800bd6816",
		"Time Zone": "Australia/Brisbane",
	},
	{
		"YHA Location Name": "Cape Byron YHA",
		"MEWS Enterprise Id": "7c16d57e-1da6-40b1-9581-ad52006a8da5",
		"Time Zone": "Australia/Sydney",
	},
	{
		"YHA Location Name": "Coolangatta YHA",
		"MEWS Enterprise Id": "7ca437de-4b33-42c7-8e0d-ad5c003cba6a",
		"Time Zone": "Australia/Brisbane",
	},
	{
		"YHA Location Name": "Fremantle Prison YHA",
		"MEWS Enterprise Id": "2c99e4aa-1e97-4774-8fd6-ad8f005a7f70",
		"Time Zone": "Australia/Perth",
	},
	{
		"YHA Location Name": "Halls Gap - Grampians Eco YHA",
		"MEWS Enterprise Id": "0e7c7c8a-db88-4bbc-80d7-ada6003c62ee",
		"Time Zone": "Australia/Melbourne",
	},
	{
		"YHA Location Name": "Hobart Central YHA",
		"MEWS Enterprise Id": "c772eae2-f559-46a7-9b90-ad9d003efe8c",
		"Time Zone": "Australia/Hobart",
	},
	{
		"YHA Location Name": "Melbourne Central YHA",
		"MEWS Enterprise Id": "b8ad44f0-f5f0-474a-882c-ad60004eb088",
		"Time Zone": "Australia/Melbourne",
	},
	{
		"YHA Location Name": "Port Elliot YHA",
		"MEWS Enterprise Id": "5fed04ae-bfe5-497c-b516-ad96008c9453",
		"Time Zone": "Australia/Adelaide",
	},
	{
		"YHA Location Name": "Sydney Central YHA",
		"MEWS Enterprise Id": "61f40fb2-4edc-46f8-b1b1-ad600045149d",
		"Time Zone": "Australia/Sydney",
	},
	{
		"YHA Location Name": "Sydney Harbour YHA",
		"MEWS Enterprise Id": "15f2f224-568f-42da-8004-ad28008f0d00",
		"Time Zone": "Australia/Sydney",
	},
	{
		"YHA Location Name": "Sydney Pittwater YHA",
		"MEWS Enterprise Id": "16ebe364-cd4e-4bb9-9f6e-ad600048a67b",
		"Time Zone": "Australia/Sydney",
	},
	{
		"YHA Location Name": "Thredbo YHA",
		"MEWS Enterprise Id": "773d759a-6463-44a1-af12-ad8a0003acef",
		"Time Zone": "Australia/Sydney",
	},
	{
		"YHA Location Name": "Newcastle Beach YHA",
		"MEWS Enterprise Id": "c9126206-53db-4b93-90fb-ad9d00427404",
		"Time Zone": "Australia/Sydney",
	},
];

// const enterprisesDev = []

export const enterprises =
	process.env.NODE_ENV === "production" ? enterprisesProd : enterprisesProd;
