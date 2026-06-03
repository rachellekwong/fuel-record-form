# Google Sheet Setup

Follow these steps after the React app is ready. Copy `google-apps-script/Code.gs` into Apps Script.

## 1. Create the spreadsheet

Create a new Google Sheet. Name it e.g. **Fuel Record Form**.

Add **5 tabs** at the bottom (rename the default sheet and add others). Tab names must match **exactly**:

| Tab name   | Record type                          |
|------------|--------------------------------------|
| `Inventory` | 油錶 (Oil Meter)                     |
| `Company`   | 公司車輛上油記錄                     |
| `SelfUse`   | 自用燃油記錄                         |
| `Customer`  | 客戶車輛上油記錄                     |
| `Received`  | 存入油缸記錄                         |

## 2. Row 1 headers (copy into each tab)

### Tab: `Inventory`

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Submission DateTime | Record Date | Fuel Type | Meter No. | Tank | Yesterday Reading | Today Reading | Closing Balance | Signature | Remarks |

### Tabs: `Company`, `SelfUse`, `Customer`

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Submission DateTime | License Plate | Quantity (L) | Fuel Type | Meter Code | Remarks |

### Tab: `Received`

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Submission DateTime | License Plate | Quantity (L) | Fuel Type | Tank Number | Remarks |

## 3. Apps Script

1. In the sheet: **Extensions → Apps Script**
2. Delete any default code and paste all of `google-apps-script/Code.gs`
3. **Save** the project

## 4. Deploy the web app

1. **Deploy → New deployment**
2. Type: **Web app**
3. **Execute as:** Me  
4. **Who has access:** Anyone  
5. Click **Deploy** and authorize when prompted
6. Copy the URL ending in **`/exec`** (not `/dev`)

## 5. Connect the React app

In the project folder, create a file named `.env`:

```
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Restart the dev server:

```bash
npm run dev
```

## 6. Test

1. Open the form, pick a record type, fill required fields, submit
2. Check the matching tab in your Google Sheet — new rows should appear

**Inventory:** one submission adds **9 rows** (meters: 1, 2, 2A, 3, 3A, 4, 4A, 5, 6). Closing balance is per tank (shared for 2/2A, 3/3A, 4/4A).

**Other types:** one row per entry in the form.

## Troubleshooting

- **Tab not found:** Tab names are case-sensitive (`SelfUse`, not `Self Use`)
- **No rows after submit:** Redeploy Apps Script after code changes (New deployment → new version)
- **CORS / network errors:** Use the `/exec` URL from a **Web app** deployment with **Anyone** access
- **Rows misaligned (2A / 3A / 4A):** Redeploy the latest Apps Script (meter codes like `2A` must be saved as text). Confirm Inventory row 1 has exactly 10 columns in the order above — **Fuel Type** (B5, 白渣, …) in column C, **Meter No.** (1, 2, 2A, …) in column D.
