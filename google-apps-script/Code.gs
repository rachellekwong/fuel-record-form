/**
 * Fuel Record Form — Google Apps Script
 *
 * Setup:
 * 1. Create a Google Sheet with the tabs and headers described in GOOGLE_SHEET_SETUP.md
 * 2. Extensions → Apps Script → paste this file
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the /exec URL into your .env as VITE_GOOGLE_SCRIPT_URL
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.recordType === "inventory") {
      writeInventory_(ss, data);
    } else {
      writeDynamic_(ss, data);
    }

    return jsonResponse_({ success: true });
  } catch (err) {
    return jsonResponse_({ success: false, error: String(err.message || err) });
  }
}

function writeInventory_(ss, data) {
  const sheet = ss.getSheetByName("Inventory");
  if (!sheet) throw new Error('Sheet tab "Inventory" not found');

  const payload = data.payload;
  payload.rows.forEach(function (row) {
    var closing =
      (payload.tankClosingBalances && payload.tankClosingBalances[row.tank]) || "";
    sheet.appendRow([
      data.submittedAt,
      payload.date,
      row.fuelType,
      row.meterCode,
      row.tank,
      row.yesterdayReading,
      row.todayReading,
      closing,
      payload.signature,
      data.remarks || "",
    ]);
  });
}

function writeDynamic_(ss, data) {
  const tabMap = {
    company: "Company",
    "self-use": "SelfUse",
    customer: "Customer",
    received: "Received",
  };

  const tabName = tabMap[data.recordType];
  if (!tabName) throw new Error("Unknown record type: " + data.recordType);

  const sheet = ss.getSheetByName(tabName);
  if (!sheet) throw new Error('Sheet tab "' + tabName + '" not found');

  const entries = data.payload.entries || [];
  entries.forEach(function (entry) {
    if (data.recordType === "received") {
      sheet.appendRow([
        data.submittedAt,
        entry.licensePlate,
        entry.quantity,
        entry.fuelType,
        entry.tankNumber || "",
        data.remarks || "",
      ]);
    } else {
      sheet.appendRow([
        data.submittedAt,
        entry.licensePlate,
        entry.quantity,
        entry.fuelType,
        entry.meterCode,
        data.remarks || "",
      ]);
    }
  });
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
