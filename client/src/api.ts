/** This file wraps all Nexus API calls used by the demo frontend. */
import type { ApiErrorBody, AccountRole, OfferDetails, OfferStats, OfferSummary, PurchasedOffer, Session } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? getDefaultApiBaseUrl();

interface LoginInput {
  role: AccountRole;
  email: string;
  password: string;
}

interface PurchaseInput {
  tenantId: string;
  offerId: string;
  email: string;
  amount: number;
}

interface PaymentSessionResponse {
  paymentSessionUrl: string;
}

interface BarcodeResponse {
  purchaseId: string;
  offerId: string;
  title: string;
  barcode: PurchasedOffer["barcode"];
}

/** Logs in a demo partner or user and returns a bearer-token session. */
export async function login(input: LoginInput): Promise<Session> {
  return apiFetch<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Logs out by revoking the current bearer token on the API. */
export async function logout(token: string): Promise<void> {
  await apiFetch<{ status: "ok" }>("/auth/logout", {
    method: "POST",
    token,
  });
}

/** Lists active offers for the logged-in account tenant. */
export async function listOffers(token: string, tenantId: string): Promise<OfferSummary[]> {
  const response = await apiFetch<{ offers: OfferSummary[] }>(`/offers/${encodeURIComponent(tenantId)}`, { token });
  return response.offers;
}

/** Loads the sub-offers and cost options for one selected offer. */
export async function getOfferDetails(token: string, offerId: string): Promise<OfferDetails> {
  return apiFetch<OfferDetails>(`/offers/${encodeURIComponent(offerId)}`, { token });
}

/** Creates a PayMe payment session for the selected offer and logged-in buyer. */
export async function createPurchase(token: string, input: PurchaseInput): Promise<PaymentSessionResponse> {
  return apiFetch<PaymentSessionResponse>("/purchase", {
    method: "POST",
    token,
    body: JSON.stringify({
      tenantId: input.tenantId,
      offerId: input.offerId,
      email: input.email,
      amount: input.amount,
      buyer_name: "Test User",
      buyer_email: input.email,
      buyer_phone: "+9725254448888",
      receiptDetails: {
        fullName: "Test User",
        email: input.email,
        phone: "+9725254448888",
        notes: "Nexus demo client purchase",
      },
    }),
  });
}

/** Lists paid purchases and first-time demo barcodes for one user. */
export async function listPurchasedOffers(token: string, tenantId: string, userEmail: string): Promise<PurchasedOffer[]> {
  const response = await apiFetch<{ purchasedOffers: PurchasedOffer[] }>(
    `/offers/status/${encodeURIComponent(tenantId)}/${encodeURIComponent(userEmail)}`,
    { token },
  );
  return response.purchasedOffers;
}

/** Loads one previously issued demo barcode again by purchase ID. */
export async function getBarcode(token: string, tenantId: string, userEmail: string, purchaseId: string): Promise<BarcodeResponse> {
  return apiFetch<BarcodeResponse>(
    `/offers/barcodes/${encodeURIComponent(tenantId)}/${encodeURIComponent(userEmail)}/${encodeURIComponent(purchaseId)}`,
    { token },
  );
}

/** Loads aggregate paid-offer stats for a partner account. */
export async function getStats(token: string, tenantId: string): Promise<OfferStats[]> {
  const response = await apiFetch<{ stats: OfferStats[] }>(`/offers/stats/${encodeURIComponent(tenantId)}`, { token });
  return response.stats;
}

/** Sends an API request with JSON headers and converts safe error bodies into exceptions. */
async function apiFetch<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json() as Promise<T>;
}

/** Reads an API error response without trusting unknown response shapes. */
async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.json() as ApiErrorBody;
    return body.message ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

/** Uses the local API by default in Vite dev and production API in built deploys. */
function getDefaultApiBaseUrl(): string {
  return import.meta.env.DEV ? "http://localhost:3000" : "https://nexus-api-test.up.railway.app";
}
