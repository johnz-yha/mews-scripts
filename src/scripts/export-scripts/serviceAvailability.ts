// import { toDate } from "date-fns-tz";
import { add } from "date-fns";
import { toDate } from "date-fns-tz";
import { ApiError, ServicesService } from "../../client";
import {
	type AvailabilityAugmented,
	AvailabilityMetrics,
	type Metrics,
} from "../../types";
import { convertToLocalTime, sumArrays } from "../../utils/utils";

interface Params {
	startUtc: string;
	endUtc: string;
	serviceId: string;
	tz: string;
}

export async function getServiceAvailability({
	serviceId,
	startUtc,
	endUtc,
	tz,
}: Params) {
	const firstTimeUnitStartUtc = getFirstTimeUnitStartUtc(startUtc);
	const lastTimeUnitStartUtc = getLastTimeUnitStartUtc(endUtc, tz);

	console.log("firstTimeUnitStartUtc: ", firstTimeUnitStartUtc);
	console.log("lastTimeUnitStartUtc: ", lastTimeUnitStartUtc);

	try {
		const res = await ServicesService.servicesGetAvailability20240122({
			requestBody: {
				AccessToken: process.env.ACCESS_TOKEN!,
				ClientToken: process.env.CLIENT_TOKEN!,
				Client: process.env.CLIENT!,
				ServiceId: serviceId,
				FirstTimeUnitStartUtc: firstTimeUnitStartUtc,
				LastTimeUnitStartUtc: lastTimeUnitStartUtc,
				Metrics: [
					"ActiveResources",
					"AllocatedBlockAvailability",
					"BlockAvailability",
					"ConfirmedReservations",
					"Occupied",
					"OutOfOrderBlocks",
					"PublicAvailabilityAdjustment",
					"UsableResources",
				],
			},
		});

		return res;
	} catch (e) {
		if (e instanceof ApiError) {
			const error = e as ApiError;
			console.log("error: ", error.body);
		} else {
			console.log(e);
		}
		throw new Error("Error fetching Service Availability");
	}
}

/**
 * Factors in the offset of when a service start in a given time unit
 * @returns
 */
export function getFirstTimeUnitStartUtc(startUtc: string) {
	console.log("startUtc: ", startUtc);
	// const offsetDate = add(new Date(startUtc), { days: 1 });
	// return offsetDate.toISOString();
	return startUtc;
}

export function getLastTimeUnitStartUtc(
	endUtc: string,
	tz: string,
	offset = 0
) {
	const dateStr = convertToLocalTime(endUtc, tz).split(" ")[0];
	const nowUTC = new Date(dateStr);
	const nextDate = add(nowUTC, { days: offset });
	const lastTimeUnitStartUtc = toDate(nextDate.toISOString().split("T")[0], {
		timeZone: tz,
	});

	return lastTimeUnitStartUtc.toISOString();
}

export function aggregateMetrics(avail: AvailabilityAugmented[]) {
	const allMetrics = {} as Metrics;
	// For each metric, sum the values for each time-unit (day)
	for (const metric of AvailabilityMetrics) {
		const arrays = avail.map((a) => a.Metrics[metric]);
		const result = sumArrays(...arrays);
		allMetrics[metric] = result;
	}
	return allMetrics;
}
