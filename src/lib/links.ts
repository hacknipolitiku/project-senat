const base = import.meta.env.BASE_URL;

export function getHomepageUrl(): string {
  return base;
}

export function getFaviconUrl(): string {
  return `${base}favicon.svg`;
}

export function getDistrictUrl(slug: string): string {
  return `${base}obvody/${slug}/`;
}

export function getPartyLogoUrl(logoFile: string): string {
  return `${base}logos/${logoFile}`;
}

export function getInstagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}

/** Short display label for a link — its hostname without "www." (e.g. "plevny.cz"). */
export function getHostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// --- Candidate sign-up Google Form -----------------------------------------
// TODO: fill in the real form once known. GOOGLE_FORM_BASE is the form's
// "/viewform" URL; GOOGLE_FORM_KANDIDAT_ENTRY is the entry id of the field
// labelled "kandidat" (find it via the form's pre-filled-link tool — it looks
// like "entry.123456789").
const GOOGLE_FORM_BASE = "https://docs.google.com/forms/d/e/FORM_ID/viewform";
const GOOGLE_FORM_KANDIDAT_ENTRY = "entry.0000000000";

/** Google Form link with the "kandidat" field pre-filled. */
export function getCandidateFormUrl(kandidat: string): string {
  const params = new URLSearchParams({
    usp: "pp_url",
    [GOOGLE_FORM_KANDIDAT_ENTRY]: kandidat,
  });
  return `${GOOGLE_FORM_BASE}?${params.toString()}`;
}
