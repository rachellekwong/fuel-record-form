import { useEffect, useState } from "react";
import { isGoogleSheetConfigured, submitToGoogleSheet } from "./submitToGoogleSheet";
import type {
  DynamicEntry,
  FormSubmission,
  InventoryRow,
  RecordType,
} from "./types";

const INVENTORY_ROW_LABELS = ["B5", "白渣", "紅渣", "B100", "電油", "HVO"];

const RECORD_TYPES: { value: RecordType; label: string }[] = [
  { value: "inventory", label: "油桶 & 缸存記錄 (Oil Barrel & Tank Inventory)" },
  { value: "company", label: "公司車輛上油記錄 (Company Vehicles Refueling)" },
  { value: "self-use", label: "自用燃油記錄 (Self-Use Fuel)" },
  { value: "customer", label: "客戶車輛上油記錄 (Customer Vehicles Refueling)" },
  { value: "received", label: "存入油缸記錄 (Fuel Received into Tank)" },
];

const FUEL_TYPES = ["ULP", "EVD", "IEVD", "B5", "B100", "HVO"];

const LICENSE_PLATES = [
  "RT5907",
  "SF8569",
  "SS4958",
  "SV7595",
  "TB4105",
  "TF6491",
  "UA7942",
  "VB1632",
  "VL3454",
  "VR3062",
  "VX5829",
  "VZ1197",
  "WA6081",
  "WA7102",
  "WB9473",
  "WZ9836",
  "XS7051",
  "XT3912",
  "YU6856",
  "ZE9780",
  "ZH4312",
  "ZW1772",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function nowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createInventoryRows(): InventoryRow[] {
  return INVENTORY_ROW_LABELS.map((label, index) => ({
    meterCode: label,
    yesterdayReading: "",
    todayReading: "",
    tank: String(index + 1),
    height: "",
  }));
}

function createDynamicEntry(): DynamicEntry {
  return {
    id: newId(),
    licensePlate: "",
    quantity: "",
    fuelType: "",
    meterCode: "",
    tankNumber: "",
  };
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function Label({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
      {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}

const inputBase =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100";

const inputError = "border-red-400 focus:border-red-500 focus:ring-red-500/20";

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [recordType, setRecordType] = useState<RecordType | "">("");
  const [inventoryDate, setInventoryDate] = useState(todayDateString());
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>(createInventoryRows);
  const [signature, setSignature] = useState("");
  const [dynamicEntries, setDynamicEntries] = useState<DynamicEntry[]>([createDynamicEntry()]);
  const [submissionDateTime, setSubmissionDateTime] = useState(nowDateTimeLocal());
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingEntry, setAddingEntry] = useState(false);

  const isInventory = recordType === "inventory";
  const isReceived = recordType === "received";
  const isDynamic =
    recordType === "company" ||
    recordType === "self-use" ||
    recordType === "customer" ||
    recordType === "received";

  // Reset section data when record type changes
  useEffect(() => {
    if (!recordType) return;
    setErrors({});
    setShowSuccess(false);
    if (recordType === "inventory") {
      setInventoryDate(todayDateString());
      setInventoryRows(createInventoryRows());
      setSignature("");
    } else {
      setDynamicEntries([createDynamicEntry()]);
    }
  }, [recordType]);

  const updateInventoryRow = (
    index: number,
    field: keyof InventoryRow,
    value: string
  ) => {
    setInventoryRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addDynamicEntry = () => {
    setAddingEntry(true);
    setDynamicEntries((entries) => [
      ...entries,
      createDynamicEntry(),
    ]);
    setTimeout(() => setAddingEntry(false), 400);
  };

  const removeDynamicEntry = (id: string) => {
    if (dynamicEntries.length <= 1) return;
    setRemovingId(id);
    setTimeout(() => {
      setDynamicEntries((entries) => entries.filter((e) => e.id !== id));
      setRemovingId(null);
    }, 280);
  };

  const updateDynamicEntry = (
    id: string,
    field: keyof DynamicEntry,
    value: string
  ) => {
    setDynamicEntries((entries) =>
      entries.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!recordType) {
      next.recordType = "請選擇記錄類型 / Please select a record type";
    }

    if (recordType === "inventory") {
      if (!inventoryDate) {
        next.inventoryDate = "請填寫日期 / Date is required";
      }
      inventoryRows.forEach((row, i) => {
        if (!row.todayReading.trim()) {
          next[`inv-today-${i}`] = "必填 / Required";
        }
      });
      if (!signature.trim()) {
        next.signature = "請簽名 / Signature is required";
      }
    }

    if (isDynamic) {
      dynamicEntries.forEach((entry) => {
        if (!entry.licensePlate.trim()) {
          next[`plate-${entry.id}`] = "必填 / Required";
        }
        if (!entry.quantity.trim()) {
          next[`qty-${entry.id}`] = "必填 / Required";
        } else if (Number(entry.quantity) <= 0) {
          next[`qty-${entry.id}`] = "請輸入有效數量 / Enter a valid quantity";
        }
        if (!entry.fuelType) {
          next[`fuel-${entry.id}`] = "必填 / Required";
        }
        if (isReceived) {
          if (!entry.tankNumber.trim()) {
            next[`tank-${entry.id}`] = "必填 / Required";
          }
        } else if (!entry.meterCode.trim()) {
          next[`meter-${entry.id}`] = "必填 / Required";
        }
      });
      if (dynamicEntries.length === 0) {
        next.entries = "至少需要一筆記錄 / At least one entry is required";
      }
    }

    if (!submissionDateTime) {
      next.submissionDateTime = "請填寫提交日期時間 / Submission date & time is required";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const typeMeta = RECORD_TYPES.find((t) => t.value === recordType)!;

    const submission: FormSubmission = {
      id: newId(),
      recordType: recordType as RecordType,
      recordTypeLabel: typeMeta.label,
      submittedAt: submissionDateTime,
      remarks,
      payload:
        recordType === "inventory"
          ? {
              date: inventoryDate,
              rows: inventoryRows,
              signature,
            }
          : {
              entries: dynamicEntries.map(({ id: _id, ...entry }) => entry),
            },
    };

    setIsSubmitting(true);
    setSubmitError(null);
    setShowSuccess(false);

    try {
      if (isGoogleSheetConfigured()) {
        await submitToGoogleSheet(submission);
      }

      setSubmissions((prev) => [submission, ...prev]);
      setShowSuccess(true);
      setRemarks("");
      setSubmissionDateTime(nowDateTimeLocal());

      if (recordType === "inventory") {
        setInventoryRows(createInventoryRows());
        setSignature("");
        setInventoryDate(todayDateString());
      } else {
        setDynamicEntries([createDynamicEntry()]);
      }
      setErrors({});
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "提交失敗，請重試 / Submission failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionTitle = (zh: string, en: string) => (
    <h2 className="mb-4 text-lg font-semibold text-slate-800">
      {zh}{" "}
      <span className="font-normal text-slate-500">({en})</span>
    </h2>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            燃油記錄表
          </h1>
          <p className="mt-1 text-sm text-slate-500">Fuel & Oil Inventory Record Form</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {!isGoogleSheetConfigured() && (
          <div
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="status"
          >
            Google Sheet 尚未連接 / Not connected to Google Sheet yet.
            <span className="mt-1 block text-amber-800">
              Add <code className="rounded bg-amber-100 px-1">VITE_GOOGLE_SCRIPT_URL</code> to a{" "}
              <code className="rounded bg-amber-100 px-1">.env</code> file — see{" "}
              <code className="rounded bg-amber-100 px-1">GOOGLE_SHEET_SETUP.md</code>.
              Submissions are saved locally until then.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Record Type */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <Label htmlFor="recordType" required>
              記錄類型 <span className="font-normal text-slate-500">(Record Type)</span>
            </Label>
            <select
              id="recordType"
              value={recordType}
              onChange={(e) => setRecordType(e.target.value as RecordType | "")}
              className={`${inputBase} text-base ${errors.recordType ? inputError : ""}`}
              aria-required="true"
              aria-invalid={!!errors.recordType}
            >
              <option value="">— 請選擇 / Please select —</option>
              {RECORD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.recordType} />
          </section>

          {/* Section 1: Inventory */}
          {isInventory && (
            <section
              className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              aria-labelledby="inventory-heading"
            >
              {sectionTitle("油桶 & 缸存記錄", "Oil Barrel & Tank Inventory")}

              <div className="mb-6 max-w-xs">
                <Label htmlFor="inventoryDate" required>
                  日期 <span className="font-normal text-slate-500">(Date)</span>
                </Label>
                <input
                  id="inventoryDate"
                  type="date"
                  value={inventoryDate}
                  onChange={(e) => setInventoryDate(e.target.value)}
                  className={`${inputBase} ${errors.inventoryDate ? inputError : ""}`}
                  aria-required="true"
                />
                <FieldError message={errors.inventoryDate} />
              </div>

              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-2 py-3 text-left font-semibold text-slate-700">
                        油錶編號 <span className="block text-xs font-normal text-slate-500">Meter Code</span>
                      </th>
                      <th className="px-2 py-3 text-left font-semibold text-slate-700">
                        昨日收工錶碼 <span className="block text-xs font-normal text-slate-500">Yesterday</span>
                      </th>
                      <th className="px-2 py-3 text-left font-semibold text-slate-700">
                        今日收工錶碼 <span className="block text-xs font-normal text-slate-500">Today *</span>
                      </th>
                      <th className="px-2 py-3 text-left font-semibold text-slate-700">
                        油缸 <span className="block text-xs font-normal text-slate-500">Tank</span>
                      </th>
                      <th className="px-2 py-3 text-left font-semibold text-slate-700">
                        存油量 <span className="block text-xs font-normal text-slate-500">Storage Volume</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryRows.map((row, index) => (
                      <tr
                        key={row.meterCode}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-2 py-2">
                          <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1.5 font-medium text-slate-800">
                            {row.meterCode}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="0"
                            value={row.yesterdayReading}
                            onChange={(e) =>
                              updateInventoryRow(index, "yesterdayReading", e.target.value)
                            }
                            className={inputBase}
                            placeholder="0"
                            aria-label={`昨日收工錶碼 ${row.meterCode}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="0"
                            value={row.todayReading}
                            onChange={(e) =>
                              updateInventoryRow(index, "todayReading", e.target.value)
                            }
                            className={`${inputBase} ${errors[`inv-today-${index}`] ? inputError : ""}`}
                            placeholder="0"
                            aria-required="true"
                            aria-label={`今日收工錶碼 ${row.meterCode}`}
                          />
                          <FieldError message={errors[`inv-today-${index}`]} />
                        </td>
                        <td className="px-2 py-2">
                          <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1.5 font-medium text-slate-800">
                            {row.tank}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="0"
                            value={row.height}
                            onChange={(e) =>
                              updateInventoryRow(index, "height", e.target.value)
                            }
                            className={inputBase}
                            placeholder="0"
                            aria-label={`存油量 ${row.meterCode}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <Label htmlFor="signature" required>
                  簽名 <span className="font-normal text-slate-500">(Signature)</span>
                </Label>
                <input
                  id="signature"
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className={`${inputBase} ${errors.signature ? inputError : ""}`}
                  placeholder="請輸入姓名 / Enter your name"
                  aria-required="true"
                />
                <FieldError message={errors.signature} />
              </div>
            </section>
          )}

          {/* Sections 2–5: Dynamic entries */}
          {isDynamic && (
            <section
              className="animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              aria-labelledby="dynamic-heading"
            >
              {recordType === "company" &&
                sectionTitle("公司車輛上油記錄", "Company Vehicles Refueling")}
              {recordType === "self-use" &&
                sectionTitle("自用燃油記錄", "Self-Use Fuel")}
              {recordType === "customer" &&
                sectionTitle("客戶車輛上油記錄", "Customer Vehicles Refueling")}
              {recordType === "received" &&
                sectionTitle("存入油缸記錄", "Fuel Received into Tank")}

              <div className="space-y-4">
                {dynamicEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`relative rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-all duration-300 sm:p-5 ${
                      removingId === entry.id
                        ? "scale-95 opacity-0"
                        : addingEntry && index === dynamicEntries.length - 1
                          ? "animate-entry ring-2 ring-blue-200"
                          : ""
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        記錄 #{index + 1} <span className="normal-case">(Entry)</span>
                      </span>
                      {dynamicEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDynamicEntry(entry.id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
                          aria-label={`移除記錄 ${index + 1}`}
                        >
                          移除 / Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`plate-${entry.id}`} required>
                          車牌 <span className="font-normal text-slate-500">(License Plate)</span>
                        </Label>
                        <select
                          id={`plate-${entry.id}`}
                          value={entry.licensePlate}
                          onChange={(e) =>
                            updateDynamicEntry(entry.id, "licensePlate", e.target.value)
                          }
                          className={`${inputBase} ${errors[`plate-${entry.id}`] ? inputError : ""}`}
                          aria-required="true"
                        >
                          <option value="">— 請選擇 / Please select —</option>
                          {LICENSE_PLATES.map((plate) => (
                            <option key={plate} value={plate}>
                              {plate}
                            </option>
                          ))}
                        </select>
                        <FieldError message={errors[`plate-${entry.id}`]} />
                      </div>

                      <div>
                        <Label htmlFor={`qty-${entry.id}`} required>
                          數量（公升）{" "}
                          <span className="font-normal text-slate-500">(Quantity - Liters)</span>
                        </Label>
                        <input
                          id={`qty-${entry.id}`}
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          value={entry.quantity}
                          onChange={(e) =>
                            updateDynamicEntry(entry.id, "quantity", e.target.value)
                          }
                          className={`${inputBase} ${errors[`qty-${entry.id}`] ? inputError : ""}`}
                          placeholder="0"
                          aria-required="true"
                        />
                        <FieldError message={errors[`qty-${entry.id}`]} />
                      </div>

                      <div>
                        <Label htmlFor={`fuel-${entry.id}`} required>
                          油品 <span className="font-normal text-slate-500">(Fuel Type)</span>
                        </Label>
                        <select
                          id={`fuel-${entry.id}`}
                          value={entry.fuelType}
                          onChange={(e) =>
                            updateDynamicEntry(entry.id, "fuelType", e.target.value)
                          }
                          className={`${inputBase} ${errors[`fuel-${entry.id}`] ? inputError : ""}`}
                          aria-required="true"
                        >
                          <option value="">— 請選擇 —</option>
                          {FUEL_TYPES.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                        <FieldError message={errors[`fuel-${entry.id}`]} />
                      </div>

                      {isReceived ? (
                        <div>
                          <Label htmlFor={`tank-${entry.id}`} required>
                            油缸 <span className="font-normal text-slate-500">(Tank Number)</span>
                          </Label>
                          <input
                            id={`tank-${entry.id}`}
                            type="text"
                            value={entry.tankNumber}
                            onChange={(e) =>
                              updateDynamicEntry(entry.id, "tankNumber", e.target.value)
                            }
                            className={`${inputBase} ${errors[`tank-${entry.id}`] ? inputError : ""}`}
                            placeholder="—"
                            aria-required="true"
                          />
                          <FieldError message={errors[`tank-${entry.id}`]} />
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor={`meter-${entry.id}`} required>
                            油錶編號 <span className="font-normal text-slate-500">(Meter Code)</span>
                          </Label>
                          <input
                            id={`meter-${entry.id}`}
                            type="text"
                            value={entry.meterCode}
                            onChange={(e) =>
                              updateDynamicEntry(entry.id, "meterCode", e.target.value)
                            }
                            className={`${inputBase} ${errors[`meter-${entry.id}`] ? inputError : ""}`}
                            placeholder="—"
                            aria-required="true"
                          />
                          <FieldError message={errors[`meter-${entry.id}`]} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addDynamicEntry}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98]"
              >
                <span className="text-lg leading-none">+</span>
                新增 / Add Entry
              </button>
              <FieldError message={errors.entries} />
            </section>
          )}

          {/* Common fields — visible once a type is selected */}
          {recordType && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                共通資料 <span className="font-normal text-slate-500">(Common Fields)</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="submissionDateTime" required>
                    提交日期時間{" "}
                    <span className="font-normal text-slate-500">(Submission Date & Time)</span>
                  </Label>
                  <input
                    id="submissionDateTime"
                    type="datetime-local"
                    value={submissionDateTime}
                    onChange={(e) => setSubmissionDateTime(e.target.value)}
                    className={`${inputBase} ${errors.submissionDateTime ? inputError : ""}`}
                    aria-required="true"
                  />
                  <FieldError message={errors.submissionDateTime} />
                </div>

                <div>
                  <Label htmlFor="remarks">
                    備註 <span className="font-normal text-slate-500">(Remarks)</span>
                  </Label>
                  <textarea
                    id="remarks"
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className={`${inputBase} resize-y`}
                    placeholder="選填 / Optional"
                  />
                </div>
              </div>

              {submitError && (
                <div
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {submitError}
                </div>
              )}

              {showSuccess && (
                <div
                  className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                  role="status"
                >
                  提交成功！可繼續填寫下一筆記錄。
                  <span className="block text-green-700">
                    Submitted successfully
                    {isGoogleSheetConfigured() ? " to Google Sheet" : ""}. You may submit another
                    record.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
              >
                {isSubmitting ? "提交中… / Submitting…" : "提交 / Submit"}
              </button>
            </section>
          )}
        </form>

        {/* Submission history */}
        {submissions.length > 0 && (
          <aside className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              已提交記錄 <span className="font-normal text-slate-500">(Submitted Records)</span>
              <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
                {submissions.length}
              </span>
            </h2>
            <ul className="space-y-3">
              {submissions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                >
                  <p className="font-medium text-slate-800">{s.recordTypeLabel}</p>
                  <p className="mt-0.5 text-slate-500">
                    {new Date(s.submittedAt).toLocaleString("zh-HK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {s.remarks && (
                    <p className="mt-1 text-slate-600">
                      備註: {s.remarks}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </main>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes entryPop {
          0% { opacity: 0; transform: scale(0.97) translateY(4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in {
          animation: fadeSlideIn 0.35s ease-out;
        }
        .animate-entry {
          animation: entryPop 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
