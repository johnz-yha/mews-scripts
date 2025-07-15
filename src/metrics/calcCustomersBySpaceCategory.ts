import { add, differenceInCalendarDays, sub } from "date-fns";
import { toDate } from "date-fns-tz";
import type {
	BookableServiceData,
	Reservation,
	ResourceCategory,
	ResourceCategoryAssignment,
	Service,
} from "../client";
import { getAllReservations } from "../scripts/export-scripts/reservations";
import { getLastTimeUnitStartUtc } from "../scripts/export-scripts/serviceAvailability";
import { type CustomerCounts } from "../types";
import { convertToLocalTime, parseMewsOffset } from "../utils/utils";
import { withCache } from "../utils/withCache";

export async function calcCustomersBySpaceType(
	stayService: Service,
	resourceCategories: ResourceCategory[],
	resourceCategoryAssignments: ResourceCategoryAssignment[],
	startUtc: string,
	endUtc: string,
	timeZone: string,
	enterpriseId: string
): Promise<CustomerCounts> {
	const { OccupancyStartOffset, OccupancyEndOffset } = stayService.Data
		?.Value! as BookableServiceData;

	const startOffset = parseMewsOffset(OccupancyStartOffset!);
	const endOffset = parseMewsOffset(OccupancyEndOffset!);

	console.log("OccupancyStartOffset: ", startOffset);

	// Handle DST for startUtc and endUtc and for each day in the date range.
	let currentDate = toDate(startUtc);
	const endDate = getLastTimeUnitStartUtc(endUtc, timeZone);
	console.log("endDate: ", endDate);

	const n = differenceInCalendarDays(endDate, currentDate);

	const customerCounts = {
		RoomCustomers: [],
		BedCustomers: [],
		DormCustomers: [],
		SiteCustomers: [],
	} as CustomerCounts;

	// TODO: Track resource Ids already counted - dont count back to back bookings

	for (let i = 0; i < n; i++) {
		// convert currentdate to local time and set to start of day.
		let currentLocal = convertToLocalTime(
			currentDate.toISOString(),
			timeZone
		);
		console.log("currentLocal: ", currentLocal);

		let startLocal = toDate(currentLocal, { timeZone: timeZone });
		startLocal = startOffset.positive
			? add(startLocal, startOffset.offset)
			: sub(startLocal, startOffset.offset);

		const startUtc = startLocal.toISOString();

		let endLocal = toDate(currentLocal, { timeZone: timeZone });
		endLocal = add(
			endOffset.positive
				? add(endLocal, endOffset.offset)
				: sub(endLocal, endOffset.offset),
			{ days: 1 }
		);

		const endUtc = endLocal.toISOString();

		// console.log("startUtc: ", startUtc);
		// console.log("endUtc: ", endUtc);

		// Fetch all reservations for the date period
		const reservations: Reservation[] = await withCache(
			[
				"getAllReservations",
				process.env.NODE_ENV!,
				enterpriseId,
				stayService.Id!,
				startUtc,
				endUtc,
			],
			() =>
				getAllReservations({
					enterpriseId: enterpriseId,
					serviceId: stayService?.Id ? stayService.Id : "",
					startUtc: startUtc,
					endUtc: endUtc,
				})
		);

		// Join reservation data with Assigned Resource
		const reservationsAugmented = reservations.map((reservation) => {
			const categoryId = resourceCategoryAssignments.find(
				(rca) => rca.ResourceId === reservation.AssignedResourceId
			)?.CategoryId;

			if (!categoryId) {
				console.log("categoryId: ", categoryId);
				console.error(
					`Resource Id not found in Resource Category Assignments: ${reservation.AssignedResourceId}`
				);
			}

			const category = resourceCategories.find(
				(rc) => rc.Id === categoryId
			);

			if (!category?.Id) {
				console.log("category: ", category);
				console.error(
					`Resource Category Id ${categoryId} not found in Resource Categories`
				);
			}

			return {
				...reservation,
				ResourceCategoryType: category?.Type,
				ResourceCategoryNames: JSON.stringify(category?.Names),
			};
		});

		const reservationsWithPaxCount = reservationsAugmented.map((r) => {
			return {
				...r,
				pax: r.PersonCounts?.reduce(
					(acc, p) => acc + (p?.Count ? p.Count : 0),
					0
				),
			};
		});

		const reservationsByResourceId = Object.groupBy(
			reservationsWithPaxCount,
			(r) => r?.AssignedResourceId!
		);

		if (
			reservationsWithPaxCount.length !==
			Object.keys(reservationsByResourceId).length
		) {
			console.error("Duplicate reservations found for the same resource");
			console.log("reservations: ", reservationsWithPaxCount.length);
			console.log(
				"reservationsByResourceId: ",
				Object.keys(reservationsByResourceId).length
			);

			Object.entries(reservationsByResourceId).forEach(
				([key, value]) =>
					value &&
					value.length > 1 &&
					console.log(
						`space: ${key}, reservations: ${value
							.map((r) => r.Id)
							.join(", ")}`
					)
			);
		}

		const uniqueReservations = Object.values(reservationsByResourceId).map(
			(r) => r?.length && r?.[0]
		) as typeof reservationsWithPaxCount;
		console.log("uniqueReservations?.length: ", uniqueReservations?.length);

		// writeToCSV(reservationsWithPaxCount, "allReservations");
		// Filter reservations where RequestedResourceCategoryId belongs to a bed, room or dorm
		const roomReservations = uniqueReservations.filter(
			(r) => r && r.ResourceCategoryType === "Room"
		);
		const bedReservations = uniqueReservations.filter(
			(r) => r && r.ResourceCategoryType === "Bed"
		);
		const dormReservations = reservationsWithPaxCount.filter(
			(r) => r && r.ResourceCategoryType === "Dorm"
		);
		const siteReservations = reservationsWithPaxCount.filter(
			(r) => r && r.ResourceCategoryType === "Site"
		);

		const roomCustomersCount = roomReservations.reduce(
			(acc, r) => acc + (r?.pax ? r.pax : 0),
			0
		);
		const bedCustomersCount = bedReservations.reduce(
			(acc, r) => acc + (r?.pax ? r.pax : 0),
			0
		);
		const dormCustomersCount = dormReservations.reduce(
			(acc, r) => acc + (r?.pax ? r.pax : 0),
			0
		);
		const siteCustomersCount = siteReservations.reduce(
			(acc, r) => acc + (r?.pax ? r.pax : 0),
			0
		);

		customerCounts.RoomCustomers.push(roomCustomersCount);
		customerCounts.BedCustomers.push(bedCustomersCount);
		customerCounts.DormCustomers.push(dormCustomersCount);
		customerCounts.SiteCustomers.push(siteCustomersCount);

		currentDate = add(currentDate, { days: 1 });
	}

	return customerCounts;
}
