import { districtSlug } from "./data";

const base = import.meta.env.BASE_URL;

export function getHomepageUrl(): string {
  return base;
}

export function getFaviconUrl(): string {
  return `${base}favicon.svg`;
}

export function getDistrictUrl(districtName: string): string {
  return `${base}obvody/${districtSlug(districtName)}/`;
}

export function getCandidateUrl(candidateSlug: string): string {
  return `${base}kandidati/${candidateSlug}/`;
}

export function getPartyLogoUrl(logoFile: string): string {
  return `${base}logos/${logoFile}`;
}
