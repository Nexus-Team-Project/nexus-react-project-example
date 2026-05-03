/** This file implements the Nexus demo UI for login, purchases, and barcodes. */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Barcode, CreditCard, DoorOpen, KeyRound, RefreshCw, Store, Ticket, UserRound } from "lucide-react";
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
import type { AccountRole, Barcode as BarcodeValue, OfferSummary, PurchasedOffer, Session } from "./types";

const USER_EMAIL = "user@example.com";

/** Renders the complete Nexus demo application. */
export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  return <Dashboard session={session} onLogout={() => setSession(null)} />;
}

/** Renders role-aware login controls with seeded demo credentials. */
function LoginPage(props: { onLogin: (session: Session) => void }): JSX.Element {
  const [role, setRole] = useState<AccountRole>("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useMutation({
    mutationFn: () => login({ role, email, password }),
    onSuccess: props.onLogin,
  });
  const canSubmit = email.trim().length > 0 && password.length > 0 && !loginMutation.isPending;

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark">
          <KeyRound aria-hidden="true" />
          <span>Nexus Demo</span>
        </div>
        <h1 id="login-title">Benefit checkout console</h1>
        <p>Sign in to Nexus Demo to run the sandbox purchase and barcode flow.</p>
        <div className="role-grid" role="radiogroup" aria-label="Demo login role">
          <button className={role === "PARTNER" ? "role-card active" : "role-card"} onClick={() => setRole("PARTNER")} type="button">
            <Store aria-hidden="true" />
            <span>Partner</span>
            <small>Business access</small>
          </button>
          <button className={role === "USER" ? "role-card active" : "role-card"} onClick={() => setRole("USER")} type="button">
            <UserRound aria-hidden="true" />
            <span>User</span>
            <small>Buyer access</small>
          </button>
        </div>
        <form className="login-form" onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) {
            loginMutation.mutate();
          }
        }}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              value={password}
            />
          </label>
          <button className="primary-action" disabled={!canSubmit} type="submit">
            {loginMutation.isPending ? "Signing in..." : `Sign in as ${role.toLowerCase()}`}
          </button>
        </form>
        {loginMutation.error ? <p className="error-text">{loginMutation.error.message}</p> : null}
      </section>
    </main>
  );
}

/** Renders authenticated partner or user workflows for offers, checkout, and barcodes. */
function Dashboard(props: { session: Session; onLogout: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState<OfferSummary | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [replayedBarcode, setReplayedBarcode] = useState<BarcodeValue | null>(null);
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
      setCheckoutUrl(data.paymentSessionUrl);
      await queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
  const logoutMutation = useMutation({
    mutationFn: () => logout(token),
    onSettled: props.onLogout,
  });

  const latestBarcode = useMemo(() => isUser ? purchasesQuery.data?.[0]?.barcode ?? null : null, [isUser, purchasesQuery.data]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Nexus Demo</span>
          <h1>{session.account.displayName}</h1>
        </div>
        <button className="icon-button" aria-label="Log out" onClick={() => logoutMutation.mutate()} type="button">
          <DoorOpen aria-hidden="true" />
        </button>
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
              </button>
            ))}
          </div>
        </aside>
        <section className="action-pane">
          {isUser ? (
            <>
              <OfferCheckout
                error={purchaseMutation.error?.message}
                isPending={purchaseMutation.isPending}
                offer={selectedOffer}
                onPurchase={(offer) => purchaseMutation.mutate(offer)}
              />
              {checkoutUrl ? <CheckoutFrame checkoutUrl={checkoutUrl} onRefresh={() => purchasesQuery.refetch()} /> : null}
              <BarcodePanel
                latestBarcode={latestBarcode}
                purchases={purchasesQuery.data ?? []}
                replayedBarcode={replayedBarcode}
                onReplay={async (purchaseId) => {
                  const response = await getBarcode(token, tenantId, userEmail, purchaseId);
                  setReplayedBarcode(response.barcode);
                }}
              />
            </>
          ) : (
            <PartnerOfferPanel stats={statsQuery.data ?? []} />
          )}
        </section>
      </section>
    </main>
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
function CheckoutFrame(props: { checkoutUrl: string; onRefresh: () => void }): JSX.Element {
  return (
    <section className="checkout-frame">
      <div className="frame-header">
        <SectionTitle icon={<CreditCard aria-hidden="true" />} title="PayMe sandbox" />
        <button className="secondary-action" onClick={props.onRefresh} type="button">
          <RefreshCw aria-hidden="true" />
          Refresh barcodes
        </button>
      </div>
      <iframe title="PayMe sandbox checkout" src={props.checkoutUrl} />
    </section>
  );
}

/** Renders first-time and replayed mock barcode data for paid purchases. */
function BarcodePanel(props: {
  latestBarcode: BarcodeValue | null;
  purchases: PurchasedOffer[];
  replayedBarcode: BarcodeValue | null;
  onReplay: (purchaseId: string) => Promise<void>;
}): JSX.Element {
  return (
    <section className="tool-band">
      <SectionTitle icon={<Barcode aria-hidden="true" />} title="Barcodes" />
      {props.latestBarcode ? <BarcodeDisplay label="First visible barcode" barcode={props.latestBarcode} /> : <p className="muted">Paid purchases appear here after the PayMe callback reaches the API.</p>}
      <div className="barcode-history">
        {props.purchases.map((purchase) => (
          <button className="secondary-action" key={purchase.purchaseId} onClick={() => void props.onReplay(purchase.purchaseId)} type="button">
            View {purchase.title}
          </button>
        ))}
      </div>
      {props.replayedBarcode ? <BarcodeDisplay label="Viewed again" barcode={props.replayedBarcode} /> : null}
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
function PartnerOfferPanel(props: { stats: Array<{ offerId: string; title: string; numberOfUsers: number; totalPurchaseAmount: number }> }): JSX.Element {
  return (
    <section className="tool-band">
      <SectionTitle icon={<Store aria-hidden="true" />} title="Partner stats" />
      <p className="muted">Partner accounts can view tenant offers and purchase totals. Purchases and barcodes belong to user accounts.</p>
      {props.stats.length === 0 ? <p className="muted">No paid purchases yet.</p> : null}
      {props.stats.map((stat) => (
        <div className="stat-row" key={stat.offerId}>
          <span>{stat.title}</span>
          <b>{stat.numberOfUsers} users</b>
          <b>{formatIls(stat.totalPurchaseAmount)}</b>
        </div>
      ))}
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
