import { add } from "date-fns";
import { toDate } from "date-fns-tz";
import "../init";
import { writeToCSV } from "../utils/utils";
import { calcCustomerStats } from "./bed-statistics";
import { enterprises } from "./enterprises";

const START_LOCAL = "2024-10-08T00:00:00"; // Inclusive
const END_LOCAL = "2024-10-09T00:00:00"; // Exclusive

const allResults = [];

for (const enterprise of enterprises) {
	console.log("Processing: ", enterprise["YHA Location Name"]);
	const startUtc = toDate(START_LOCAL, {
		timeZone: enterprise["Time Zone"],
	}).toISOString();

	const endUtc = toDate(END_LOCAL, {
		timeZone: enterprise["Time Zone"],
	}).toISOString();

	console.log("startUtc: ", startUtc);
	console.log("endUtc: ", endUtc);

	const results = await calcCustomerStats(
		startUtc,
		endUtc,
		enterprise["MEWS Enterprise Id"],
		enterprise["Time Zone"]
	);
	console.log("results: ", results);

	const resultsObjArray = results.availableBeds.map((_, i) => ({
		DateUtc: add(toDate(startUtc), { days: i }).toISOString(),
		DateLocal: add(toDate(startUtc), { days: i }).toLocaleDateString(
			"en-AU",
			{
				timeZone: enterprise["Time Zone"],
			}
		),
		"YHA Location Name": enterprise["YHA Location Name"],
		"Available Beds": results.availableBeds[i],
		"Occupied Beds": results.occupiedBeds[i],
		"Available Rooms": results.availableRooms[i],
		"Occupied Rooms": results.occupiedRooms[i],
	}));

	allResults.push(...resultsObjArray);

	await writeToCSV(
		resultsObjArray,
		`bed-stats-${enterprise["YHA Location Name"]}-${START_LOCAL}-${END_LOCAL}`.replaceAll(
			":",
			"-"
		)
	);
}

await writeToCSV(
	allResults,
	`bed-stats-all-${START_LOCAL}-${END_LOCAL}`.replaceAll(":", "-")
);
