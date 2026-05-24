import { type FormEvent, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Order, ProductReview, WalletLedgerEntry, WarrantyClaim } from "@/lib/types";
import { MIN_TOP_UP, rupiah } from "@/app/constants";
import type { AuthMode, CloudSyncState } from "@/app/types";
import { canReviewOrder, formatDate } from "@/app/state";
import { InvoiceStatusBadge } from "@/components/common";

export function AccountView({
  authEmail,
  authMode,
  authName,
  authPassword,
  authReady,
  authSubmitting,
  claimInvoice,
  claimInvoiceToken,
  claimIssue,
  claims,
  cloudSync,
  ledger,
  orders,
  reviews,
  session,
  topUpAmount,
  walletBalance,
  onAuth,
  onClaimInvoiceChange,
  onClaimInvoiceTokenChange,
  onClaimIssueChange,
  onEmailChange,
  onLogout,
  onModeChange,
  onNameChange,
  onOpenInvoice,
  onPasswordChange,
  onReviewSubmit,
  onTopUp,
  onTopUpAmountChange,
  onWarrantyClaim
}: {
  authEmail: string;
  authMode: AuthMode;
  authName: string;
  authPassword: string;
  authReady: boolean;
  authSubmitting: boolean;
  claimInvoice: string;
  claimInvoiceToken: string;
  claimIssue: string;
  claims: WarrantyClaim[];
  cloudSync: CloudSyncState;
  ledger: WalletLedgerEntry[];
  orders: Order[];
  reviews: ProductReview[];
  session: Session | null;
  topUpAmount: number;
  walletBalance: number;
  onAuth: (event: FormEvent<HTMLFormElement>) => void;
  onClaimInvoiceChange: (value: string) => void;
  onClaimInvoiceTokenChange: (value: string) => void;
  onClaimIssueChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onLogout: () => void;
  onModeChange: (value: AuthMode) => void;
  onNameChange: (value: string) => void;
  onOpenInvoice: (invoiceNumber: string) => void;
  onPasswordChange: (value: string) => void;
  onReviewSubmit: (order: Order, rating: number, comment: string) => Promise<void>;
  onTopUp: (event: FormEvent<HTMLFormElement>) => void;
  onTopUpAmountChange: (value: number) => void;
  onWarrantyClaim: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!authReady) {
    return <div className="empty-results">Memuat akun pelanggan.</div>;
  }

  if (!session) {
    return (
      <section className="account-layout">
        <div className="panel account-auth">
          <p className="eyebrow">Pelanggan</p>
          <h1>{authMode === "login" ? "Masuk akun" : "Daftar akun"}</h1>
          <div className="category-tabs auth-tabs">
            <button className={`category-tab ${authMode === "login" ? "is-active" : ""}`} type="button" onClick={() => onModeChange("login")}>
              Login
            </button>
            <button className={`category-tab ${authMode === "register" ? "is-active" : ""}`} type="button" onClick={() => onModeChange("register")}>
              Daftar
            </button>
          </div>
          <form className="checkout-form" onSubmit={onAuth}>
            {authMode === "register" ? (
              <label className="field">
                <span>Nama</span>
                <input value={authName} onChange={(event) => onNameChange(event.target.value)} placeholder="Nama pelanggan" />
              </label>
            ) : null}
            <label className="field">
              <span>Email</span>
              <input value={authEmail} onChange={(event) => onEmailChange(event.target.value)} placeholder="nama@email.com" type="email" />
            </label>
            <label className="field">
              <span>Password</span>
              <input value={authPassword} onChange={(event) => onPasswordChange(event.target.value)} type="password" />
            </label>
            <button className="primary-btn" disabled={authSubmitting} type="submit">
              {authSubmitting ? "Memproses" : authMode === "login" ? "Masuk" : "Daftar"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  const settledTopups = ledger.filter((entry) => entry.kind === "TOPUP" && entry.status === "SETTLED").reduce((sum, entry) => sum + entry.amount, 0);
  const settledRefunds = ledger.filter((entry) => entry.kind === "REFUND" && entry.status === "SETTLED").reduce((sum, entry) => sum + entry.amount, 0);
  const spentFromBalance = ledger.filter((entry) => entry.kind === "PAYMENT" && entry.status === "SETTLED").reduce((sum, entry) => sum + entry.amount, 0);
  const pendingTopups = ledger.filter((entry) => entry.kind === "TOPUP" && entry.status === "PENDING").reduce((sum, entry) => sum + entry.amount, 0);
  const topUpPresets = [50000, 100000, 250000];

  return (
    <section className="account-layout">
      <div className="panel account-head">
        <div>
          <p className="eyebrow">Profil pelanggan</p>
          <h1>{getDisplayName(session)}</h1>
          <p className="muted">Sync cloud: {cloudSync}</p>
        </div>
        <div className="account-balance">
          <span>Saldo</span>
          <strong>{rupiah.format(walletBalance)}</strong>
          <small>Untuk checkout dan refund garansi</small>
        </div>
        <button className="ghost-btn" type="button" onClick={onLogout}>
          Keluar
        </button>
      </div>

      <ProfileSummary session={session} orders={orders} reviews={reviews} />

      <div className="admin-grid">
        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Saldo</p>
              <h2>Top up</h2>
            </div>
          </div>
          <form className="stock-form" onSubmit={onTopUp}>
            <label className="field">
              <span>Nominal</span>
              <input min={MIN_TOP_UP} step={1000} type="number" value={topUpAmount} onChange={(event) => onTopUpAmountChange(Number(event.target.value))} />
            </label>
            <div className="table-actions">
              {topUpPresets.map((amount) => (
                <button className="small-btn" key={amount} type="button" onClick={() => onTopUpAmountChange(amount)}>
                  {rupiah.format(amount)}
                </button>
              ))}
            </div>
            <button className="primary-btn" type="submit">
              Bayar via Xendit
            </button>
          </form>
          <div className="profile-metrics compact-metrics">
            <ProfileMetric label="Top up settled" value={rupiah.format(settledTopups)} />
            <ProfileMetric label="Refund masuk" value={rupiah.format(settledRefunds)} />
            <ProfileMetric label="Dipakai" value={rupiah.format(spentFromBalance)} />
            <ProfileMetric label="Top up pending" value={rupiah.format(pendingTopups)} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Garansi</p>
              <h2>Klaim via invoice</h2>
            </div>
          </div>
          <form className="stock-form" onSubmit={onWarrantyClaim}>
            <label className="field">
              <span>Invoice</span>
              <input value={claimInvoice} onChange={(event) => onClaimInvoiceChange(event.target.value)} placeholder="PBY-20260512-8F3K2A" />
            </label>
            <label className="field">
              <span>Token invoice</span>
              <input value={claimInvoiceToken} onChange={(event) => onClaimInvoiceTokenChange(event.target.value)} placeholder="Untuk order guest" />
            </label>
            <label className="field">
              <span>Masalah</span>
              <textarea rows={4} value={claimIssue} onChange={(event) => onClaimIssueChange(event.target.value)} placeholder="Akun tidak bisa login" />
            </label>
            <button className="primary-btn" type="submit">
              Buat Klaim
            </button>
          </form>
        </div>
      </div>

      <PurchaseHistoryTable orders={orders} reviews={reviews} onOpenInvoice={onOpenInvoice} onReviewSubmit={onReviewSubmit} />
      <WalletLedgerTable ledger={ledger} />
      <WarrantyClaimList claims={claims} />
    </section>
  );
}

function ProfileSummary({ session, orders, reviews }: { session: Session; orders: Order[]; reviews: ProductReview[] }) {
  const deliveredCount = orders.filter((order) => order.deliveryStatus === "DELIVERED").length;
  const waitingCount = orders.filter((order) => order.paymentStatus === "WAITING_PAYMENT").length;

  return (
    <section className="panel profile-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Profil</p>
          <h2>Data akun pelanggan</h2>
        </div>
        <span className="status-badge success">Aktif</span>
      </div>
      <div className="detail-grid account-profile-grid">
        <ProfileDetail label="Nama" value={getDisplayName(session)} />
        <ProfileDetail label="Email" value={session.user.email ?? "-"} />
        <ProfileDetail label="ID pelanggan" value={session.user.id.slice(0, 8).toUpperCase()} />
        <ProfileDetail label="Bergabung" value={session.user.created_at ? formatDate(session.user.created_at) : "-"} />
      </div>
      <div className="profile-metrics">
        <ProfileMetric label="Pembelian" value={orders.length} />
        <ProfileMetric label="Akun terkirim" value={deliveredCount} />
        <ProfileMetric label="Menunggu bayar" value={waitingCount} />
        <ProfileMetric label="Ulasan" value={reviews.length} />
      </div>
    </section>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PurchaseHistoryTable({
  orders,
  reviews,
  onOpenInvoice,
  onReviewSubmit
}: {
  orders: Order[];
  reviews: ProductReview[];
  onOpenInvoice: (invoiceNumber: string) => void;
  onReviewSubmit: (order: Order, rating: number, comment: string) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const reviewsByOrder = useMemo(() => new Map(reviews.map((review) => [review.orderId, review])), [reviews]);

  function updateDraft(orderId: string, patch: Partial<{ rating: number; comment: string }>) {
    const existing = reviewsByOrder.get(orderId);
    setDrafts((items) => ({
      ...items,
      [orderId]: {
        rating: items[orderId]?.rating ?? existing?.rating ?? 5,
        comment: items[orderId]?.comment ?? existing?.comment ?? "",
        ...patch
      }
    }));
  }

  async function submitReview(event: FormEvent<HTMLFormElement>, order: Order) {
    event.preventDefault();
    const existing = reviewsByOrder.get(order.id);
    const draft = drafts[order.id] ?? { rating: existing?.rating ?? 5, comment: existing?.comment ?? "" };
    setSubmittingOrderId(order.id);
    try {
      await onReviewSubmit(order, draft.rating, draft.comment);
    } finally {
      setSubmittingOrderId(null);
    }
  }

  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Pembelian</p>
          <h2>Riwayat akun dan ulasan</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Produk</th>
              <th>Total</th>
              <th>Status</th>
              <th>Akun</th>
              <th>Ulasan</th>
            </tr>
          </thead>
          <tbody>
            {orders.length ? (
              orders.map((order) => {
                const existing = reviewsByOrder.get(order.id);
                const draft = drafts[order.id] ?? { rating: existing?.rating ?? 5, comment: existing?.comment ?? "" };
                const eligible = canReviewOrder(order);
                return (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.invoiceNumber}</strong>
                      <br />
                      <button className="small-btn" type="button" onClick={() => onOpenInvoice(order.invoiceNumber)}>
                        Buka invoice
                      </button>
                    </td>
                    <td>
                      {order.productName}
                      <br />
                      <span className="muted">{order.variantName}</span>
                    </td>
                    <td>{rupiah.format(order.total)}</td>
                    <td>
                      <InvoiceStatusBadge status={order.paymentStatus} />
                      <br />
                      <InvoiceStatusBadge status={order.deliveryStatus} />
                    </td>
                    <td>{order.accounts.length ? `${order.accounts.length} akun` : "-"}</td>
                    <td>
                      {eligible ? (
                        <form className="review-form" onSubmit={(event) => submitReview(event, order)}>
                          <div className="rating-picker" role="group" aria-label={`Rating untuk ${order.invoiceNumber}`}>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                aria-label={`${rating} bintang`}
                                className={rating <= draft.rating ? "is-active" : ""}
                                key={rating}
                                type="button"
                                onClick={() => updateDraft(order.id, { rating })}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          <textarea
                            maxLength={800}
                            rows={3}
                            value={draft.comment}
                            onChange={(event) => updateDraft(order.id, { comment: event.target.value })}
                            placeholder="Tulis pengalaman setelah akun diterima"
                          />
                          <div className="review-actions">
                            <span>{existing ? "Ulasan tersimpan" : "Belum diulas"}</span>
                            <button className="small-btn" disabled={submittingOrderId === order.id || draft.comment.trim().length < 4} type="submit">
                              {submittingOrderId === order.id ? "Menyimpan" : existing ? "Update" : "Kirim"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <span className="muted">Bisa diulas setelah akun paid dan terkirim.</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6}>Belum ada pembelian.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getDisplayName(session: Session) {
  const metadata = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const name = typeof metadata.name === "string" ? metadata.name.trim() : "";
  return fullName || name || session.user.email?.split("@")[0] || "Pelanggan ProByte";
}

function WalletLedgerTable({ ledger }: { ledger: WalletLedgerEntry[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Saldo</p>
          <h2>Mutasi saldo</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Tipe</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length ? (
              ledger.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.createdAt)}</td>
                  <td>{entry.kind}</td>
                  <td>
                    {entry.kind === "PAYMENT" ? "-" : "+"}
                    {rupiah.format(entry.amount)}
                  </td>
                  <td><InvoiceStatusBadge status={entry.status} /></td>
                  <td>{entry.note}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>Belum ada mutasi saldo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WarrantyClaimList({ claims }: { claims: WarrantyClaim[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Garansi</p>
          <h2>Klaim saya</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Masalah</th>
              <th>Status</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {claims.length ? (
              claims.map((claim) => (
                <tr key={claim.id}>
                  <td>
                    <strong>{claim.invoiceNumber}</strong>
                  </td>
                  <td>{claim.issueSummary}</td>
                  <td><InvoiceStatusBadge status={claim.status} /></td>
                  <td>{formatDate(claim.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>Belum ada klaim.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
