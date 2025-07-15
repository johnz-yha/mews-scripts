import type {
	ResourceCategory,
	Service,
	ServiceAvailabilityResultV20240122,
} from "../client";
import { getAllResourceCategories } from "../scripts/export-scripts/resourceCategories";
import { getAllResourceCategoryAssignments } from "../scripts/export-scripts/resourceCategoryAssignments";
import {
	aggregateMetrics,
	getServiceAvailability,
} from "../scripts/export-scripts/serviceAvailability";
import { getAllServices } from "../scripts/export-scripts/services";
import type {
	AvailabilityAugmented,
	AvailabilityOccupancyStats,
	Metrics,
} from "../types";
import { withCache } from "../utils/withCache";
import { calcCustomersBySpaceType } from "./calcCustomersBySpaceCategory";
import { chunkifyDateRange } from "./chunkifyDateRange";

export async function calcCustomerStats(
	startUtc: string,
	endUtc: string,
	enterpriseId: string,
	tz: string
): Promise<AvailabilityOccupancyStats> {
	// Get the service ID of the YHA "Stay" service
	const stayService = await getStayService(enterpriseId);

	// Get resource categories and cache
	const resourceCategories: ResourceCategory[] = await withCache(
		[
			"getAllResourceCategories",
			process.env.NODE_ENV!,
			enterpriseId,
			stayService.Id!,
		],
		() =>
			getAllResourceCategories({
				enterpriseId: enterpriseId,
				serviceId: stayService.Id!,
			})
	);

	// Get resource Category Assignments and cache - to relate resources to resource categories
	const resourceCategoryAssignments = await withCache(
		[
			"getAllResourceCategoryAssignments",
			process.env.NODE_ENV!,
			enterpriseId,
		],
		() =>
			getAllResourceCategoryAssignments({
				enterpriseId: enterpriseId,
				resourceCategoryIds: resourceCategories.map((r) => r.Id),
			})
	);

	const allBedMetrics: Metrics = {
		ActiveResources: [],
		AllocatedBlockAvailability: [],
		BlockAvailability: [],
		ConfirmedReservations: [],
		Occupied: [],
		OutOfOrderBlocks: [],
		PublicAvailabilityAdjustment: [],
		UsableResources: [],
		OptionalReservations: [],
		OtherServiceReservationCount: [],
	};
	const allRoomMetrics: Metrics = {
		ActiveResources: [],
		AllocatedBlockAvailability: [],
		BlockAvailability: [],
		ConfirmedReservations: [],
		Occupied: [],
		OutOfOrderBlocks: [],
		PublicAvailabilityAdjustment: [],
		UsableResources: [],
		OptionalReservations: [],
		OtherServiceReservationCount: [],
	};
	const allDormMetrics: Metrics = {
		ActiveResources: [],
		AllocatedBlockAvailability: [],
		BlockAvailability: [],
		ConfirmedReservations: [],
		Occupied: [],
		OutOfOrderBlocks: [],
		PublicAvailabilityAdjustment: [],
		UsableResources: [],
		OptionalReservations: [],
		OtherServiceReservationCount: [],
	};

	const allSiteMetrics: Metrics = {
		ActiveResources: [],
		AllocatedBlockAvailability: [],
		BlockAvailability: [],
		ConfirmedReservations: [],
		Occupied: [],
		OutOfOrderBlocks: [],
		PublicAvailabilityAdjustment: [],
		UsableResources: [],
		OptionalReservations: [],
		OtherServiceReservationCount: [],
	};

	const dateChunks = chunkifyDateRange(startUtc, endUtc, 90);

	for (const chunk of dateChunks) {
		const avail = await getServiceAvailabilityByDateRange(
			stayService,
			resourceCategories,
			chunk.startUtc,
			chunk.endUtc,
			tz
		);

		const bedAvailability = avail.filter(
			(a) => a.ResourceCategory.Type === "Bed"
		);
		const roomAvailability = avail.filter(
			(a) => a.ResourceCategory.Type === "Room"
		);
		const dormAvailability = avail.filter(
			(a) => a.ResourceCategory.Type === "Dorm"
		);
		const siteAvailability = avail.filter(
			(a) => a.ResourceCategory.Type === "Site"
		);

		const bedMetrics = aggregateMetrics(bedAvailability);
		const roomMetrics = aggregateMetrics(roomAvailability);
		const dormMetrics = aggregateMetrics(dormAvailability);
		const siteMetrics = aggregateMetrics(siteAvailability);

		for (const metric of Object.keys(bedMetrics)) {
			allBedMetrics[metric as keyof Metrics].push(
				...bedMetrics[metric as keyof Metrics]
			);
		}
		for (const metric of Object.keys(roomMetrics)) {
			allRoomMetrics[metric as keyof Metrics].push(
				...roomMetrics[metric as keyof Metrics]
			);
		}
		for (const metric of Object.keys(dormMetrics)) {
			allDormMetrics[metric as keyof Metrics].push(
				...dormMetrics[metric as keyof Metrics]
			);
		}
		for (const metric of Object.keys(siteMetrics)) {
			allSiteMetrics[metric as keyof Metrics].push(
				...siteMetrics[metric as keyof Metrics]
			);
		}
	}

	console.log("roomMetrics: ", allRoomMetrics);
	console.log("bedMetrics: ", allBedMetrics);
	console.log("dormMetrics: ", allDormMetrics);
	console.log("siteMetrics: ", allSiteMetrics);

	// Calculate customers metric by fetching all reservations for each date
	const { BedCustomers, RoomCustomers, DormCustomers, SiteCustomers } =
		await calcCustomersBySpaceType(
			stayService,
			resourceCategories,
			resourceCategoryAssignments,
			startUtc,
			endUtc,
			tz,
			enterpriseId
		);

	console.log("RoomCustomers: ", RoomCustomers);
	console.log("BedCustomers: ", BedCustomers);
	console.log("DormCustomers: ", DormCustomers);

	// Sum the ActiveResources metric for Rooms and Dorms space types.
	const availableRooms = allRoomMetrics.ActiveResources.map((m, ix) => {
		return m + allDormMetrics.ActiveResources[ix];
	});
	// Sum the Occupied metric for Rooms and Dorms space types.
	const occupiedRooms = allRoomMetrics.Occupied.map((m, ix) => {
		return m + allDormMetrics.Occupied[ix];
	});
	// Sum the Customers metric for Rooms, Beds and Dorms space types.
	const occupiedBeds = BedCustomers.map((m, ix) => {
		return m + RoomCustomers[ix] + DormCustomers[ix] + SiteCustomers[ix];
	});

	return {
		availableBeds: allBedMetrics.ActiveResources,
		occupiedBeds: occupiedBeds,
		availableRooms: availableRooms,
		occupiedRooms: occupiedRooms,
	};
}

export async function getServiceAvailabilityByDateRange(
	stayService: Service,
	resourceCategories: ResourceCategory[],
	startUtc: string,
	endUtc: string,
	tz: string
): Promise<AvailabilityAugmented[]> {
	const avail = [];

	// Make endUtc exclusive
	const endUtcExc = new Date(endUtc);
	// subtract 1 second from endUtc
	endUtcExc.setSeconds(endUtcExc.getSeconds() - 1);

	console.log("::getServiceAvailabilityByDateRange::");
	console.log("startUtc: ", startUtc);
	console.log("endUtc: ", endUtcExc);

	const serviceAvailability: ServiceAvailabilityResultV20240122 =
		await withCache(
			[
				"getServiceAvailability",
				process.env.NODE_ENV!,
				stayService.Id!,
				startUtc,
				endUtcExc.toISOString(),
			],
			() =>
				getServiceAvailability({
					serviceId: stayService.Id!,
					startUtc,
					endUtc: endUtcExc.toISOString(),
					tz,
				})
		);

	if (!serviceAvailability?.ResourceCategoryAvailabilities) {
		throw new Error("No resource availabilities found. Exiting...");
	}

	console.log("TimeUnitStartsUtc: ", serviceAvailability?.TimeUnitStartsUtc);

	// Join service availability with resource categories data
	for (let availability of serviceAvailability!
		.ResourceCategoryAvailabilities) {
		const category = resourceCategories.find(
			(rc) => rc.Id === availability.ResourceCategoryId
		);

		if (category?.Id) {
			const availabilityAugmented = {
				...availability,
				ResourceCategory: category,
			};
			avail.push(availabilityAugmented);
		}
	}
	return avail;
}

export async function getStayService(enterpriseId: string) {
	const services: Service[] = await withCache(
		["getAllServices", process.env.NODE_ENV!, enterpriseId],
		() => getAllServices({ count: 500, enterpriseId })
	);
	const stayService = services.find((s) => s.Name === "Stay");

	if (!stayService || !stayService?.Id) {
		throw new Error("Stay service not found");
	}

	console.log("stayService: ", stayService);
	return stayService;
}
