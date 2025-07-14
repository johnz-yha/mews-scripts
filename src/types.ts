import type {
	ResourceAvailabilityMetricTypeEnum,
	ResourceCategory,
	ResourceCategoryAvailabilityV20240122,
} from "./client";

export interface OrderItemT {
	AccountingCategoryId?: string;
	Amount?: number;
	TaxRateCode?: string;
	TaxRate?: number;
	TaxValue?: number;
	ConsumedUtc?: string;
	GLCode?: string;
	Location?: string;
	Reference?: string;
	Date?: string;
	DebitCredit?: string;
	TransCode?: string;
}

export interface PaymentT {
	AccountingCategoryId?: string;
	Amount?: number;
	TaxRateCode?: string;
	TaxRate?: number;
	TaxValue?: number;
	ChargedUtc?: string;
	GLCode?: string;
	Location?: string;
	Reference?: string;
	Date?: string;
	DebitCredit?: string;
	TransCode?: string;
}

export interface EnterpriseLookup {
	"YHA Location Name": string;
	"MEWS Enterprise Id": string;
	"Client Token": string;
	"Access Token": string;
	"Time Zone": string;
}
export type AvailabilityAugmented = ResourceCategoryAvailabilityV20240122 & {
	ResourceCategory: ResourceCategory;
};

export const AvailabilityMetrics = [
	"ActiveResources",
	"AllocatedBlockAvailability",
	"BlockAvailability",
	"ConfirmedReservations",
	"Occupied",
	"OutOfOrderBlocks",
	"PublicAvailabilityAdjustment",
	"UsableResources",
] as const;

export type Metrics = Record<ResourceAvailabilityMetricTypeEnum, Array<number>>;

export type CSVRow = {
	Date?: string;
	Reference?: string;
	"GL Code"?: string;
	Amount?: string;
	"DR/CR"?: string;
	"Trans Code"?: string;
	Location?: string;
	"Tax Rate"?: number;
	"Tax Value"?: string;
	Amount1: string;
};
export type CustomerCounts = {
	RoomCustomers: number[];
	BedCustomers: number[];
	DormCustomers: number[];
	SiteCustomers: number[];
};
export type AvailabilityOccupancyStats = {
	availableBeds: number[];
	occupiedBeds: number[];
	availableRooms: number[];
	occupiedRooms: number[];
};
export interface ParsedOffset {
	positive: boolean;
	offset: {
		months: number;
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
	};
}
