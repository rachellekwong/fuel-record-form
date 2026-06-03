import type { FormSubmission } from "./types";

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL as string | undefined;

export function isGoogleSheetConfigured(): boolean {
  return Boolean(SCRIPT_URL?.trim());
}

export async function submitToGoogleSheet(
  submission: FormSubmission
): Promise<void> {
  if (!SCRIPT_URL?.trim()) {
    throw new Error(
      "Google Sheet URL is not configured. Add VITE_GOOGLE_SCRIPT_URL to your .env file."
    );
  }

  // text/plain avoids CORS preflight with Google Apps Script web apps
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    throw new Error(`Server error (${response.status}). Please try again.`);
  }

  const result = (await response.json()) as { success?: boolean; error?: string };

  if (!result.success) {
    throw new Error(result.error ?? "Submission failed. Please try again.");
  }
}
