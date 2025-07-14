# Notes

## Important Accounting Category Properties

- AccountingCategoryId
- Name
- External GL Code
- CostCenterCode
- EnterpriseId

## Important Order Items entity properties

We are aggregating the amounts by AccountingCategoryId

- Id
- AccountingCategoryId
- Amount.Currency
- Amount.GrossValue
- Amount.TaxValues.Code
- Amount.TaxValues.Value

## Important Payment entity properties

We are aggregating the amounts by Type:

- Id
- EnterpriseId
- AccountingCategoryId
- Amount.Currency
- Amount.GrossValue
- Amount.TaxValues[0]
- ?? Amount.Breakdown.Items ??
- Type
- CreatedUtc

- Group by date first, then by Accounting Category

## Expected Values

- SYDC 1st April: Occupied beds = 430. aka overnights. Sum of customers in bed, room and dorm reservations
- Confirmed Bed Reservations from Mews API: 448. Occupied Beds 448

## TODO

- Need to get Time Unit offset for each enterprises' Stay service. Use this to calculating the CollidingUtc period when calling getAllReservations