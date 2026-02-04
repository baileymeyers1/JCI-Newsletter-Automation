import { google } from 'googleapis';

export type SheetRow = Record<string, string | number> & { _rowNumber?: number };

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

function getSheetsClient() {
  if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    throw new Error('Missing Google Sheets env vars');
  }

  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

export async function getSheetRows(sheetName: string): Promise<SheetRow[]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`
  });

  const values = response.data.values || [];
  const headers = (values[0] || []).map((h) => String(h).trim());
  const rows = values.slice(1);

  return rows.map((row, index) => {
    const record: SheetRow = { _rowNumber: index + 2 };
    headers.forEach((header, i) => {
      record[header] = row[i] ?? '';
    });
    return record;
  });
}

export async function appendRow(sheetName: string, record: Record<string, string>): Promise<void> {
  const sheets = getSheetsClient();
  const existing = await getSheetRows(sheetName);
  const headers = existing[0] ? Object.keys(existing[0]).filter((key) => key !== '_rowNumber') : Object.keys(record);
  const row = headers.map((header) => record[header] ?? '');

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row]
    }
  });
}

export async function updateRow(sheetName: string, rowNumber: number, record: Record<string, string>): Promise<void> {
  const sheets = getSheetsClient();
  const existing = await getSheetRows(sheetName);
  const headers = existing[0] ? Object.keys(existing[0]).filter((key) => key !== '_rowNumber') : Object.keys(record);
  const row = headers.map((header) => record[header] ?? '');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowNumber}:Z${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row]
    }
  });
}

export async function deleteRow(sheetName: string, rowNumber: number): Promise<void> {
  const sheets = getSheetsClient();

  const sheetInfo = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID
  });

  const sheet = sheetInfo.data.sheets?.find((s) => s.properties?.title === sheetName);
  if (!sheet?.properties?.sheetId) {
    throw new Error(`Sheet ${sheetName} not found`);
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber
            }
          }
        }
      ]
    }
  });
}
