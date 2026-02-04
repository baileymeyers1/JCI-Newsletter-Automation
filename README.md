# Client Portal

A lightweight web UI for managing Clients, Recipients, and Logs backed by Google Sheets.

## Setup

1. Copy `.env.example` to `.env.local` and fill in values.
2. Create a Google Service Account and share the spreadsheet with the service account email.
3. Install deps and run locally:

```bash
npm install
npm run dev
```

## Environment variables

- `GOOGLE_SHEETS_ID`: Spreadsheet ID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Service account email
- `GOOGLE_PRIVATE_KEY`: Private key (replace line breaks with `\n`)
- `APP_PASSWORD`: Shared login password
- `SESSION_SECRET`: Random string for signing the session cookie

## Notes

- Sheets must have tabs named `Clients`, `Recipients`, and `Log`.
- Column headers must match the fields used in the UI.
