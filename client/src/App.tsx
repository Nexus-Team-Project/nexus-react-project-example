/** This file implements the Nexus demo UI for login, purchases, and barcodes. */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Barcode, CreditCard, LogOut, Store, Ticket } from "lucide-react";
import { toast } from "sonner";
import {
  createPurchase,
  getBarcode,
  getOfferDetails,
  getStats,
  listOffers,
  listPurchasedOffers,
  login,
  logout,
} from "./api";
import { LoginPage } from "./LoginPage";
import { clearStoredSession, readSeenBarcodeIds, readStoredSession, writeSeenBarcodeIds, writeStoredSession } from "./sessionStore";
import type { Barcode as BarcodeValue, OfferSummary, PurchasedOffer, Session } from "./types";

const USER_EMAIL = "user@example.com";
type UserView = "offers" | "purchases";
interface VisibleBarcode {
  purchaseId: string;
  barcode: BarcodeValue;
}

/** Renders the complete Nexus demo application. */
export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(() => readStoredSession());

  function handleLogin(nextSession: Session): void {
    writeStoredSession(nextSession);
    setSession(nextSession);
  }

  function handleLogout(): void {
    clearStoredSession();
    setSession(null);
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
}

/** Renders authenticated partner or user workflows for offers, checkout, and barcodes. */
function Dashboard(props: { session: Session; onLogout: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState<OfferSummary | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [visibleBarcode, setVisibleBarcode] = useState<VisibleBarcode | null>(null);
  const [userView, setUserView] = useState<UserView>("offers");
  const [oneTimeBarcode, setOneTimeBarcode] = useState<PurchasedOffer | null>(null);
  const { session } = props;
  const token = session.token;
  const tenantId = session.account.tenantId;
  const isUser = session.account.role === "USER";
  const userEmail = isUser ? session.account.email : USER_EMAIL;

  const offersQuery = useQuery({
    queryKey: ["offers", token, tenantId],
    queryFn: () => listOffers(token, tenantId),
  });
  const detailsQuery = useQuery({
    queryKey: ["offer-details", token, selectedOffer?.offerId],
    queryFn: () => getOfferDetails(token, selectedOffer?.offerId ?? ""),
    enabled: Boolean(selectedOffer),
  });
  const purchasesQuery = useQuery({
    queryKey: ["purchases", token, tenantId, userEmail],
    queryFn: () => listPurchasedOffers(token, tenantId, userEmail),
    enabled: isUser,
    refetchInterval: checkoutUrl ? 3500 : false,
  });
  const statsQuery = useQuery({
    queryKey: ["stats", token, tenantId],
    queryFn: () => getStats(token, tenantId),
    enabled: !isUser,
  });
  const purchaseMutation = useMutation({
    mutationFn: async (offer: OfferSummary) => {
      const amount = detailsQuery.data ? getPurchaseAmount(detailsQuery.data.subOffers[0]?.costOptions[0], offer.price) : offer.price;
      return createPurchase(token, { tenantId, offerId: offer.offerId, email: userEmail, amount });
    },
    onSuccess: async (data) => {
      setOneTimeBarcode(null);
      setCheckoutUrl(data.paymentSessionUrl);
      setUserView("offers");
      await queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
  const logoutMutation = useMutation({
    mutationFn: () => logout(token),
    onSettled: () => {
      toast.success("Logged out successfully!");
      props.onLogout();
    },
  });

  useEffect(() => {
    if (!isUser || !checkoutUrl || oneTimeBarcode || !purchasesQuery.data) {
      return;
    }

    const seenIds = readSeenBarcodeIds(session.account.email);
    const freshPurchase = purchasesQuery.data.find((purchase) => !seenIds.has(purchase.purchaseId));
    if (!freshPurchase) {
      return;
    }

    seenIds.add(freshPurchase.purchaseId);
    writeSeenBarcodeIds(session.account.email, seenIds);
    setOneTimeBarcode(freshPurchase);
    setCheckoutUrl(null);
  }, [checkoutUrl, isUser, oneTimeBarcode, purchasesQuery.data, session.account.email]);

  useEffect(() => {
    function handlePaymentResult(event: MessageEvent<unknown>): void {
      if (!isPaymentResultMessage(event.data)) {
        return;
      }

      setCheckoutUrl(null);
      void purchasesQuery.refetch();
    }

    window.addEventListener("message", handlePaymentResult);
    return () => window.removeEventListener("message", handlePaymentResult);
  }, [purchasesQuery]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Nexus Demo</span>
          <h1>{session.account.displayName}</h1>
        </div>
        
        <div className="tenant-badge-desktop">
          <span style={{ fontSize: "11px", color: "var(--text-muted, #6b7280)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Active Tenant</span>
          <strong style={{ fontSize: "16px", color: "var(--text-main, #111827)" }}>{session.account.tenantId}</strong>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div className="tenant-badge-mobile">
            <span style={{ fontSize: "11px", color: "var(--text-muted, #6b7280)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Active Tenant</span>
            <strong style={{ fontSize: "14px", color: "var(--text-main, #111827)" }}>{session.account.tenantId}</strong>
          </div>
          <button className="icon-button" aria-label="Log out" title="Log out" onClick={() => logoutMutation.mutate()} type="button">
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </header>
      <section className="workspace">
        <aside className="inventory-pane">
          <SectionTitle icon={<Ticket aria-hidden="true" />} title="Seeded offers" />
          {offersQuery.isLoading ? <p className="muted">Loading offers...</p> : null}
          {offersQuery.error ? <p className="error-text">{offersQuery.error.message}</p> : null}
          <div className="offer-list">
            {(offersQuery.data ?? []).map((offer) => (
              <button className={selectedOffer?.offerId === offer.offerId ? "offer-row active" : "offer-row"} key={offer.offerId} onClick={() => setSelectedOffer(offer)} type="button">
                <img src={offer.image} alt="" />
                <span>
                  <strong>{offer.title}</strong>
                  <small>{offer.summary}</small>
                </span>
                <b>{formatIls(offer.price)}</b>
                <em>{offer.available} left</em>
              </button>
            ))}
          </div>
        </aside>
        <section className="action-pane">
          {isUser ? (
            <>
              <UserTabs value={userView} onChange={setUserView} />
              {userView === "offers" ? (
                <>
                  <OfferCheckout
                    error={purchaseMutation.error?.message}
                    isPending={purchaseMutation.isPending}
                    offer={selectedOffer}
                    onPurchase={(offer) => purchaseMutation.mutate(offer)}
                  />
                  {checkoutUrl ? <CheckoutFrame checkoutUrl={checkoutUrl} /> : null}
                  {oneTimeBarcode ? <OneTimeBarcode purchase={oneTimeBarcode} /> : null}
                </>
              ) : (
                <PurchasesPanel
                  purchases={purchasesQuery.data ?? []}
                  visibleBarcode={visibleBarcode}
                  onHide={() => setVisibleBarcode(null)}
                  onReplay={async (purchaseId) => {
                    const response = await getBarcode(token, tenantId, userEmail, purchaseId);
                    setVisibleBarcode({ purchaseId, barcode: response.barcode });
                  }}
                />
              )}
            </>
          ) : (
            <PartnerOfferPanel stats={statsQuery.data ?? []} offers={offersQuery.data ?? []} />
          )}
        </section>
      </section>
    </main>
  );
}

/** Renders user navigation between offer checkout and purchase history. */
function UserTabs(props: { value: UserView; onChange: (value: UserView) => void }): JSX.Element {
  return (
    <div className="tab-bar" role="tablist" aria-label="User workspace">
      <button className={props.value === "offers" ? "tab-button active" : "tab-button"} onClick={() => props.onChange("offers")} type="button">
        Offers
      </button>
      <button className={props.value === "purchases" ? "tab-button active" : "tab-button"} onClick={() => props.onChange("purchases")} type="button">
        Purchases
      </button>
    </div>
  );
}

/** Renders a compact section heading with an icon. */
function SectionTitle(props: { icon: JSX.Element; title: string }): JSX.Element {
  return (
    <div className="section-title">
      {props.icon}
      <h2>{props.title}</h2>
    </div>
  );
}

/** Renders the selected offer and starts the PayMe checkout session. */
function OfferCheckout(props: {
  error: string | undefined;
  isPending: boolean;
  offer: OfferSummary | null;
  onPurchase: (offer: OfferSummary) => void;
}): JSX.Element {
  return (
    <section className="tool-band">
      <SectionTitle icon={<CreditCard aria-hidden="true" />} title="Sandbox checkout" />
      {props.offer ? (
        <div className="checkout-line">
          <span>
            <strong>{props.offer.title}</strong>
            <small>{formatIls(props.offer.price)} through PayMe sandbox</small>
          </span>
          <button className="primary-action compact" disabled={props.isPending} onClick={() => props.onPurchase(props.offer!)} type="button">
            {props.isPending ? "Creating..." : "Buy"}
          </button>
        </div>
      ) : (
        <p className="muted">Select an offer to start a purchase.</p>
      )}
      {props.error ? <p className="error-text">{props.error}</p> : null}
    </section>
  );
}

/** Renders the PayMe hosted checkout URL in an iframe for the demo purchase flow. */
function CheckoutFrame(props: { checkoutUrl: string }): JSX.Element {
  return (
    <section className="checkout-frame">
      <div className="frame-header">
        <SectionTitle icon={<CreditCard aria-hidden="true" />} title="PayMe sandbox" />
      </div>
      <iframe title="PayMe sandbox checkout" src={props.checkoutUrl} />
    </section>
  );
}

/** Renders the one-time barcode shown after a fresh payment completes. */
function OneTimeBarcode(props: { purchase: PurchasedOffer }): JSX.Element {
  return (
    <section className="tool-band">
      <SectionTitle icon={<Barcode aria-hidden="true" />} title="Payment complete" />
      <BarcodeDisplay label={props.purchase.title} barcode={props.purchase.barcode} />
    </section>
  );
}

/** Renders purchase history with explicit buttons before showing a barcode. */
function PurchasesPanel(props: {
  purchases: PurchasedOffer[];
  visibleBarcode: VisibleBarcode | null;
  onReplay: (purchaseId: string) => Promise<void>;
  onHide: () => void;
}): JSX.Element {
  return (
    <section className="tool-band">
      <SectionTitle icon={<Barcode aria-hidden="true" />} title="Purchases" />
      {props.purchases.length === 0 ? <p className="muted">Paid purchases appear here after the PayMe callback reaches the API.</p> : null}
      <div className="purchase-history">
        {props.purchases.map((purchase) => (
          <div className="purchase-row" key={purchase.purchaseId}>
            <span>
              <strong>{purchase.title}</strong>
              <small>{new Date(purchase.purchaseDate).toLocaleDateString()}</small>
            </span>
            {props.visibleBarcode?.purchaseId === purchase.purchaseId ? (
              <button className="secondary-action" onClick={props.onHide} type="button">
                Hide barcode
              </button>
            ) : !props.visibleBarcode ? (
              <button className="secondary-action" onClick={() => void props.onReplay(purchase.purchaseId)} type="button">
                Show barcode
              </button>
            ) : null}
            {props.visibleBarcode?.purchaseId === purchase.purchaseId ? <BarcodeDisplay label={purchase.title} barcode={props.visibleBarcode.barcode} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Renders one barcode as large scan-friendly text. */
function BarcodeDisplay(props: { label: string; barcode: BarcodeValue }): JSX.Element {
  return (
    <div className="barcode-box">
      <small>{props.label}</small>
      <strong>{props.barcode.value}</strong>
      <span>{props.barcode.format} mock</span>
    </div>
  );
}

/** Renders partner-only offer stats without purchase or barcode controls. */
function PartnerOfferPanel(props: { 
  stats: Array<{ offerId: string; title: string; numberOfUsers: number; userEmails: string[]; totalPurchaseAmount: number }>;
  offers: OfferSummary[];
}): JSX.Element {
  return (
    <section className="tool-band">
      <SectionTitle icon={<Store aria-hidden="true" />} title="Partner stats" />
      <p className="muted">Partner accounts can view tenant offers and purchase totals. Purchases and barcodes belong to user accounts.</p>
      {props.offers.length === 0 ? <p className="muted">No offers found.</p> : null}
      {props.offers.map((offer) => {
        const stat = props.stats.find(s => s.offerId === offer.offerId) || { numberOfUsers: 0, totalPurchaseAmount: 0, userEmails: [] as string[] };
        return (
          <div className="stat-row" key={offer.offerId}>
            <span>
              <strong>{offer.title}</strong>
              <small>{stat.userEmails.length > 0 ? stat.userEmails.join(", ") : "No buyers yet"}</small>
            </span>
            <b>{stat.numberOfUsers} users</b>
            <b>{formatIls(stat.totalPurchaseAmount)}</b>
            <b>{offer.available} left</b>
          </div>
        );
      })}
    </section>
  );
}

/** Chooses the fixed or fallback price used when creating a purchase. */
function getPurchaseAmount(option: { cost?: number; minAmount?: number } | undefined, fallback: number): number {
  return option?.cost ?? option?.minAmount ?? fallback;
}

/** Formats an ILS amount for compact UI labels. */
function formatIls(value: number): string {
  return new Intl.NumberFormat("en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(value);
}

/** Detects payment result messages sent by the iframe success and failure pages. */
function isPaymentResultMessage(data: unknown): data is { type: "nexus-payment-result"; status: string } {
  return (
    typeof data === "object"
    && data !== null
    && "type" in data
    && data.type === "nexus-payment-result"
    && "status" in data
    && typeof data.status === "string"
  );
}
