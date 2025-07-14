import { add, differenceInDays, isBefore } from "date-fns";
import { toDate } from "date-fns-tz";

export function chunkifyDateRange(
	startUtc: string,
	endUtc: string,
	chunkSize: number = 30
	// tz: string = "",
	// offset: number = 0
): { startUtc: string; endUtc: string }[] {
	// TODO: Handle daylight savings boundaries
	// test bypass chunkifying
	console.log("chunkifyDateRange has been disabled.");
	return [{ startUtc, endUtc }];

	const dateChunks = [];
	let startDate = toDate(startUtc);
	const endDate = toDate(endUtc);

	while (isBefore(startDate, endDate)) {
		if (
			// endDate.getTime() - startDate.getTime() <=
			// chunkSize * 24 * 60 * 60 * 1000
			differenceInDays(endDate, startDate) <= chunkSize
		) {
			dateChunks.push({
				startUtc: startDate.toISOString(),
				endUtc: endDate.toISOString(),
			});
			break;
		}

		// const chunkEnd = new Date(startDate);
		// chunkEnd.setDate(chunkEnd.getDate() + chunkSize);
		const chunkEnd = add(startDate, { days: chunkSize });
		const chunk = {
			startUtc: startDate.toISOString(),
			endUtc: chunkEnd.toISOString(),
		};
		dateChunks.push(chunk);
		// startDate.setDate(startDate.getDate() + chunkSize);
		startDate = add(startDate, { days: chunkSize });
	}

	return dateChunks;
}

// const START_LOCAL = "2024-10-03T00:00:00"; // Inclusive
// const END_LOCAL = "2024-10-07T00:00:00"; // Exclusive
// const TZ = "Australia/Brisbane";

// const startUtc = toDate(START_LOCAL, {
// 	timeZone: TZ,
// }).toISOString();

// const endUtc = toDate(END_LOCAL, {
// 	timeZone: TZ,
// }).toISOString();

// console.log("startUtc: ", startUtc);
// console.log("endUtc: ", endUtc);

// const chunks = chunkifyDateRange(startUtc, endUtc, 1);

// console.log("chunks: ", chunks);
