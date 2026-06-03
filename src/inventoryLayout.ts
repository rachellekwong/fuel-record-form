/** Paper form layout: 葵涌倉錶碼及缸存記錄 */

export interface InventoryMeterDef {
  rowId: string;
  fuelType: string;
  fuelTypeRowSpan: number;
  showFuelType: boolean;
  meterCode: string;
  tank: string;
  tankRowSpan: number;
  showTank: boolean;
  closingBalanceRowSpan: number;
  showClosingBalance: boolean;
}

const GROUPS: { fuelType: string; meters: { code: string; tank: string }[] }[] = [
  { fuelType: "B5", meters: [{ code: "1", tank: "1" }] },
  { fuelType: "白渣", meters: [{ code: "2", tank: "2" }, { code: "2A", tank: "2" }] },
  { fuelType: "紅渣", meters: [{ code: "3", tank: "3" }, { code: "3A", tank: "3" }] },
  { fuelType: "B100", meters: [{ code: "4", tank: "4" }, { code: "4A", tank: "4" }] },
  { fuelType: "電油", meters: [{ code: "5", tank: "5" }] },
  { fuelType: "HVO", meters: [{ code: "6", tank: "6" }] },
];

export const INVENTORY_METER_DEFS: InventoryMeterDef[] = GROUPS.flatMap((group) =>
  group.meters.map((meter, index) => ({
    rowId: `${group.fuelType}-${meter.code}`,
    fuelType: group.fuelType,
    fuelTypeRowSpan: group.meters.length,
    showFuelType: index === 0,
    meterCode: meter.code,
    tank: meter.tank,
    tankRowSpan: group.meters.length,
    showTank: index === 0,
    closingBalanceRowSpan: group.meters.length,
    showClosingBalance: index === 0,
  }))
);

export const INVENTORY_TANKS = ["1", "2", "3", "4", "5", "6"] as const;

/** Meter / tank selector for refueling forms (sections 2–5) */
export const METER_CODE_OPTIONS = ["1", "2", "2A", "3", "3A", "4", "4A", "5", "6"];
