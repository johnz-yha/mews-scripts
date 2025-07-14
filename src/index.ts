import { toDate } from "date-fns-tz";
import {
	ConfigurationsService,
	type AccountingCategory,
	type Enterprise,
	type OrderItem,
	type Payment,
} from "./client";
import "./init";
import { getAllAccountingCategories } from "./services/accountingCategories";
import {
	aggregateRevenueItems,
	getAllOrderItemsConsumed,
	transformOrderItems,
} from "./services/orderItems";
import {
	aggregatePaymentItems,
	getAllPayments,
	transformPayments,
} from "./services/payments";
import { withCache } from "./utils/withCache";

import { add } from "date-fns";
import Papa from "papaparse";
import { calcCustomerStats } from "./metrics/bed-statistics";
import { calcLedger } from "./revenue/calcLedger";
import { getAllEnterprises } from "./services/enterprises";
import {
	getAllOutletsConsumed,
	transformOutletItems,
} from "./services/outlets";
import { getTaxValues } from "./services/taxations";
import type { CSVRow, EnterpriseLookup } from "./types";
import { formatCurrency } from "./utils/utils";

const ENV = process.env.NODE_ENV || "development";

console.log("ENVIRONMENT: ", ENV);

const START_LOCAL = "2025-06-29T00:00:00";
const END_LOCAL = "2025-06-30T00:00:00";

console.log("Report start date: ", START_LOCAL);
console.log("Report start date: ", END_LOCAL);

interface InputArgs {
	startDateLocal: string;
	endDateLocal: string;
	reportType: "Individual Date" | "Consolidated Date Range";
}

async function main(args: InputArgs) {
	const { startDateLocal, endDateLocal, reportType } = args;

	const configuration = await withCache(["getConfiguration", ENV], () =>
		ConfigurationsService.configurationGet({
			requestBody: {
				AccessToken: process.env.ACCESS_TOKEN!,
				ClientToken: process.env.CLIENT_TOKEN!,
				Client: process.env.CLIENT!,
			},
		})
	);

	const taxValues = await getTaxValues(configuration);

	// PER PROPERTY
	// Get enterprises id's from lookup table
	const yhaLocationsFile =
		process.env.NODE_ENV === "production"
			? "./.secrets/yha-locations-prod.csv"
			: "./.secrets/yha-locations-dev.csv";
	const locationsFile = Bun.file(yhaLocationsFile);
	const parsed = Papa.parse(await locationsFile.text(), {
		header: true,
		skipEmptyLines: true,
	});

	const eodEnterprises = parsed.data as EnterpriseLookup[];
	let enterprises: Enterprise[] = await withCache(
		["getAllEnterprises", ENV],
		() => getAllEnterprises({ count: 100 })
	);
	const enterpriseIds = eodEnterprises.map((e) => e["MEWS Enterprise Id"]);
	enterprises = enterprises.filter((e) => enterpriseIds.includes(e.Id));

	console.log("Mews EOD Enterprises: ", enterprises.length);

	// Loop through and pass enterprise id to each function

	const allTxns = [] as CSVRow[];

	for await (const enterprise of enterprises) {
		if (!enterprise?.Id) {
			console.error(
				`Enterprise ID not found for property: ${enterprise?.Name} ${enterprise?.Id}`
			);
			continue;
		}

		console.log("Processing data for enterprise: ", enterprise?.Name);
		const TZ = enterprise.TimeZoneIdentifier;
		const startUtc = toDate(startDateLocal, {
			timeZone: TZ,
		}).toISOString();
		const endUtc = toDate(endDateLocal, {
			timeZone: TZ,
		}).toISOString();

		// Fetch Accounting Categories and cache (long term)
		const accountingCategories: AccountingCategory[] = await withCache(
			[
				"getAllAccountingCategories",
				ENV,
				enterprise.Name.replaceAll(" ", "-"),
			],
			() =>
				getAllAccountingCategories({
					count: 250,
					enterpriseId: enterprise.Id,
				})
		);

		// Get Cost Center Code
		const rrCat = accountingCategories.find(
			(c) => c.Name === "Room Revenue"
		);
		const locationCode = rrCat?.CostCenterCode;

		// Fetch Order Items and cache
		const orderItems: OrderItem[] = await withCache(
			[
				"getAllOrderItemsConsumed",
				ENV,
				enterprise.Name,
				startDateLocal,
				endDateLocal,
			],
			() =>
				getAllOrderItemsConsumed({
					count: 500,
					startUtc: startUtc,
					endUtc: endUtc,
					enterpriseId: enterprise.Id,
				})
		);

		if (
			!orderItems ||
			!accountingCategories ||
			!accountingCategories.length
		) {
			console.error("Failed to load dependent data. Exiting...");
			return;
		}

		// Transform & Aggregate revenue by Date and Accounting Category ID
		const orderItemsTransformed = transformOrderItems(orderItems, TZ);

		const outletItems = await withCache(
			[
				"getAllOutletsConsumed",
				ENV,
				enterprise.Name,
				startDateLocal,
				endDateLocal,
			],
			() =>
				getAllOutletsConsumed({
					count: 500,
					startUtc,
					endUtc,
					enterpriseId: enterprise.Id,
				})
		);
		const outletItemsTransformed = transformOutletItems(outletItems, TZ);
		const allRevenueItems = [
			...orderItemsTransformed,
			...outletItemsTransformed,
		];

		// TODO: Need to group by tax rate as well e.g. Revenue AU-S and AU-R
		const revenueItems = aggregateRevenueItems(allRevenueItems, taxValues);

		// Fetch payments
		const payments: Payment[] = await withCache(
			[
				"getAllPayments",
				ENV,
				enterprise.Name,
				startDateLocal,
				endDateLocal,
			],
			() =>
				getAllPayments({
					count: 500,
					startUtc: startUtc,
					endUtc: endUtc,
					enterpriseId: enterprise.Id,
				})
		);

		// Transform & Aggregate payments by Date and Accounting Category ID
		const paymentsTransformed = transformPayments(payments, TZ);
		const paymentsAggregated = aggregatePaymentItems(paymentsTransformed);
		const transactionItems = [...revenueItems, ...paymentsAggregated];

		// Join OrderItem and Payment data with Accounting Categories & Tax Rates
		for (const item of transactionItems) {
			const category = accountingCategories.find(
				(c) => c.Id === item.AccountingCategoryId
			);
			const taxRate = taxValues?.find((t) => t.Code === item.TaxRateCode);

			if (category?.Id) {
				if (!category?.ExternalCode) {
					console.warn(
						"External code not found for accounting category. Check entry in Mews: ",
						category
					);
				}
				(item.TransCode = category?.Name ?? undefined),
					(item.GLCode = category?.ExternalCode?.trim() ?? undefined);
				item.Location = locationCode ?? undefined;

				item.DebitCredit = item?.Amount
					? item?.Amount >= 0
						? "C"
						: "D"
					: "C";
				item.Reference = `${locationCode}-${item?.Date?.replaceAll(
					"/",
					"-"
				)}`;
				item.TaxRate = taxRate?.Value;
			} else {
				console.error("Accounting Category not found for item: ", item);
				console.error("Accounting Category: ", category);
			}
		}

		const txByDate = Object.groupBy(
			transactionItems,
			(item) => item?.Date ?? "unknown"
		);

		if (!txByDate) {
			console.log(
				"No transactions present for this property for dates specified."
			);
		} else {
			// Calculate ledger item for each date
			for (const [date, items] of Object.entries(txByDate)) {
				items &&
					transactionItems.push(
						calcLedger(items, date, locationCode)
					);
			}
		}

		// Final formatting
		const txns = transactionItems
			.map((item) => {
				if (!item?.GLCode) {
					if (item.Amount === 0) {
						console.warn(
							"Zero amount transaction...ignoring: ",
							item
						);
						return;
					} else {
						console.error("GL Code not found for item: ", item);
					}
				}

				const res = {
					Date: item.Date,
					Reference: item.Reference,
					"GL Code": item.GLCode,
					Amount: formatCurrency(item.Amount),
					"DR/CR": item.DebitCredit,
					"Trans Code": item.TransCode,
					Location: item.Location,
					"Tax Rate": item?.TaxRate ? item.TaxRate * 100 : 0,
					"Tax Value":
						item?.TransCode !== "Ledger"
							? formatCurrency(item.TaxValue)
							: undefined,
					Amount1: formatCurrency(item.Amount),
				};
				return res;
			})
			.filter((i) => i) as CSVRow[];

		// Calculate and add bed/dorm/room statistics
		const customerStats = await calcCustomerStats(
			startUtc,
			endUtc,
			enterprise.Id,
			enterprise.TimeZoneIdentifier
		);

		// Enable/disable bed stats here
		const statsMapping = {
			// availableBeds: {
			// 	name: "Available Beds",
			// 	glCode: "BAVI",
			// },
			occupiedBeds: {
				name: "Occupied Beds",
				glCode: "ONIG",
			},
			// availableRooms: {
			// 	name: "Available Rooms",
			// 	glCode: "RAVI",
			// },
			// occupiedRooms: {
			// 	name: "Occupied Rooms",
			// 	glCode: "OCCR",
			// },
		};

		const statsRows: CSVRow[] = [];

		for (const [key] of Object.entries(statsMapping)) {
			const value = customerStats[key as keyof typeof statsMapping];
			const rows = value.map((v, i) => {
				const currentDate = add(
					toDate(startUtc, {
						timeZone: enterprise.TimeZoneIdentifier,
					}),
					{ days: i }
				);

				return {
					Date: new Date(currentDate).toLocaleDateString("en-AU", {
						timeZone: enterprise.TimeZoneIdentifier,
					}),
					Reference: `${locationCode}-${new Date(currentDate)
						.toLocaleDateString("en-AU", {
							timeZone: enterprise.TimeZoneIdentifier,
						})
						.replaceAll("/", "-")}`,
					"GL Code": `${locationCode}-${
						statsMapping[key as keyof typeof statsMapping].glCode
					}`,
					"Trans Code": `${
						statsMapping[key as keyof typeof statsMapping].name
					}`,
					Location: locationCode ?? undefined,
					Amount1: v?.toString(),
				};
			});
			statsRows.push(...rows);
		}

		allTxns.push(...statsRows);

		// Push to all transactions
		if (txns) {
			allTxns.push(...txns);
		}
		// END OF PER PROPERTY LOOP
	}

	const csvColumns = [
		"Date",
		"Reference",
		"GL Code",
		"Amount",
		"DR/CR",
		"Trans Code",
		"Location",
		"Tax Rate",
		"Tax Value",
		"Amount1",
	];

	if (reportType === "Individual Date") {
		const groupedByDate = Object.groupBy(allTxns, (item) =>
			item && item?.Date ? item.Date : "unknown"
		);

		for await (const [date, items] of Object.entries(groupedByDate)) {
			if (items) {
				const csv = Papa.unparse(items, {
					skipEmptyLines: true,
					header: true,
					columns: csvColumns,
				});

				const outputFilename = `${date
					.split("T")[0]
					.split("/")
					.reverse()
					.join("-")}`;

				await Bun.write(
					`./output/${outputFilename}.json`,
					JSON.stringify(items)
				);
				await Bun.write(`./output/${outputFilename}.csv`, csv);
			} else {
				console.warn(
					`No transactions found for date: ${date}. Not generating report.`
				);
			}
		}
	} else if (reportType === "Consolidated Date Range") {
		// Write all transactions to a single CSV file
		const csv = Papa.unparse(allTxns, {
			skipEmptyLines: true,
			header: true,
			columns: csvColumns,
		});
		const outputFilename = `${startDateLocal.split("T")[0]}-to-${
			endDateLocal.split("T")[0]
		}`;

		await Bun.write(
			`./output/${outputFilename}.json`,
			JSON.stringify(allTxns)
		);
		await Bun.write(`./output/${outputFilename}.csv`, csv);
	}

	return;
}

// Run program
await main({
	startDateLocal: START_LOCAL,
	endDateLocal: END_LOCAL,
	reportType: "Individual Date",
});
