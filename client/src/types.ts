/** This file defines the API and UI types used by the Nexus demo frontend. */

export type AccountRole = "PARTNER" | "USER";

export interface SessionAccount {
  role: AccountRole;
  email: string;
  tenantId: string;
  displayName: string;
}

export interface Session {
  token: string;
  tokenType: "Bearer";
  expiresAt: string;
  account: SessionAccount;
}

export interface OfferSummary {
  offerId: string;
  image: string;
  title: string;
  summary: string;
  price: number;
}

export interface CostOption {
  type: "fixed" | "custom";
  cost?: number;
  minAmount?: number;
  maxAmount?: number;
  available: number;
}

export interface SubOffer {
  subOfferId: string;
  images: string[];
  title: string;
  summary: string;
  terms: string;
  costOptions: CostOption[];
}

export interface OfferDetails {
  offerId: string;
  subOffers: SubOffer[];
}

export interface Barcode {
  value: string;
  format: "CODE_128";
  isMock: true;
}

export interface PurchasedOffer {
  purchaseId: string;
  offerId: string;
  title: string;
  purchaseDate: string;
  expiryDate: string;
  status: "active" | "expired" | "used";
  amount: number;
  barcode: Barcode;
}

export interface OfferStats {
  offerId: string;
  title: string;
  numberOfUsers: number;
  userEmails: string[];
  totalPurchaseAmount: number;
}

export interface ApiErrorBody {
  errorCode?: string;
  message?: string;
}
