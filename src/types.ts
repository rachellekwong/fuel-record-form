export type RecordType =
  | "inventory"
  | "company"
  | "self-use"
  | "customer"
  | "received";

export interface InventoryRow {
  rowId: string;
  fuelType: string;
  meterCode: string;
  yesterdayReading: string;
  todayReading: string;
  tank: string;
}

export interface DynamicEntry {
  id: string;
  licensePlate: string;
  quantity: string;
  fuelType: string;
  meterCode: string;
  tankNumber: string;
}

export interface InventoryPayload {
  date: string;
  rows: InventoryRow[];
  tankClosingBalances: Record<string, string>;
  signature: string;
}

export interface DynamicPayload {
  entries: Omit<DynamicEntry, "id">[];
}

export interface FormSubmission {
  id: string;
  recordType: RecordType;
  recordTypeLabel: string;
  submittedAt: string;
  remarks: string;
  payload: InventoryPayload | DynamicPayload;
}
