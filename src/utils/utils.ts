import { format, toZonedTime } from "date-fns-tz";
import Papa from "papaparse";
import type { ParsedOffset } from "../types";

// Transform and Aggregate payments data by ?
export function sumCurrencyValues(key: string, items?: any[]) {
	return items?.length
		? parseFloat(
				items
					.reduce(
						(acc, item) => acc + (item?.[key] ? item[key] : 0),
						0
					)
					.toFixed(2)
		  )
		: 0;
}

export function formatCurrency(value: number | undefined): string {
	if (!value) {
		return "$0.00";
	}

	// let v = parseFloat(value.toFixed(2));
	if (value >= 0) {
		return `$${value.toFixed(2)}`;
	} else {
		return `-$${Math.abs(value).toFixed(2)}`;
	}
}
/**
 * Sums N arrays of numbers by index. Handles arrays of different lengths
 * @param arrays
 * @returns
 */

export function sumArrays(...arrays: any[]) {
	const n = arrays.reduce((max, xs) => Math.max(max, xs.length), 0);
	const result = Array.from({ length: n });
	return result.map((_, i) =>
		arrays.map((xs) => xs[i] || 0).reduce((sum, x) => sum + x, 0)
	);
}

export async function writeToCSV(items: any[], filename: string) {
	const csv = Papa.unparse(items, {
		skipEmptyLines: true,
		header: true,
	});

	await Bun.write(`./output/${filename}.csv`, csv);
}

export function flatten(obj: Record<string, any>) {
	const result = {} as Record<string, any>;
	for (const key of Object.keys(obj)) {
		if (typeof obj[key] === "object") {
			const nested = flatten(obj[key]) as Record<string, any>;
			for (const nestedKey of Object.keys(nested)) {
				result[`${key}.${nestedKey}`] = nested[nestedKey];
			}
		} else {
			result[key] = obj[key];
		}
	}
	return result;
}

export function parseMewsOffset(duration: string): ParsedOffset {
	const regex =
		/^P(?<months>\d+)M(?<days>\d+)DT(?<hours>\d+)H(?<minutes>\d+)M(?<seconds>\d+)S$/;
	const match = duration.match(regex);

	if (!match || !match.groups) {
		throw new Error("Invalid duration format");
	}

	return {
		positive: duration?.startsWith("P") ? true : false,
		offset: {
			months: parseInt(match.groups.months, 10),
			days: parseInt(match.groups.days, 10),
			hours: parseInt(match.groups.hours, 10),
			minutes: parseInt(match.groups.minutes, 10),
			seconds: parseInt(match.groups.seconds, 10),
		},
	};
}
//
//
export function convertToLocalTime(isoString: string, tz: string): string {
	// Convert the ISO string to a zoned time in local time
	const zonedDate = toZonedTime(isoString, tz);

	// Format the date in a human-readable format (e.g., YYYY-MM-DD HH:mm:ss)
	const formattedDate = format(zonedDate, "yyyy-MM-dd HH:mm:ssXXX", {
		timeZone: tz,
	});

	return formattedDate;
}
