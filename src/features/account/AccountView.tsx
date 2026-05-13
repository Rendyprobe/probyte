import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Order, WalletLedgerEntry, WarrantyClaim } from "@/lib/types";
import { MIN_TOP_UP, rupiah } from "@/app/constants";
import type { AuthMode, CloudSyncState } from "@/app/types";
import { formatDate } from "@/app/state";

export function AccountView({
  authEmail,
  authMode,
  authName,
  authPassword,
  authReady,
  authSubmitting,
  claimInvoice,
  claimIssue,
  claims,
  cloudSync,
  ledger,
  orders,
  session,
  topUpAmount,
  walletBalance,
  onAuth,
  onClaimInvoiceChange,
  onClaimIssueChange,
  onEmailChange,
  onLogout,
  onModeChange,
  onNameChange,
  onPasswordChange,
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
  claimIssue: string;
  claims: WarrantyClaim[];
  cloudSync: CloudSyncState;
  ledger: WalletLedgerEntry[];
  orders: Order[];
  session: Session | null;
  topUpAmount: number;
  walletBalance: number;
  onAuth: (event: FormEvent<HTMLFormElement>) => void;
  onClaimInvoiceChange: (value: string) => void;
  onClaimIssueChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onLogout: () => void;
  onModeChange: (value: AuthMode) => void;
  onNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
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

  return (
    <section className="account-layout">
      <div className="panel account-head">
        <div>
          <p className="eyebrow">Pelanggan</p>
          <h1>{session.user.email}</h1>
          <p className="muted">Sync cloud: {cloudSync}</p>
        </div>
        <div className="account-balance">
          <span>Saldo</span>
          <strong>{rupiah.format(walletBalance)}</strong>
        </div>
        <button className="ghost-btn" type="button" onClick={onLogout}>
          Keluar
        </button>
      </div>

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
            <button className="primary-btn" type="submit">
              Bayar via Xendit
            </button>
          </form>
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
              <span>Masalah</span>
              <textarea rows={4} value={claimIssue} onChange={(event) => onClaimIssueChange(event.target.value)} placeholder="Akun tidak bisa login" />
            </label>
            <button className="primary-btn" type="submit">
              Buat Klaim
            </button>
          </form>
        </div>
      </div>

      <PurchaseHistoryTable orders={orders} />
      <WalletLedgerTable ledger={ledger} />
      <WarrantyClaimList claims={claims} />
    </section>
  );
}

function PurchaseHistoryTable({ orders }: { orders: Order[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Pembelian</p>
          <h2>Riwayat akun</h2>
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
            </tr>
          </thead>
          <tbody>
            {orders.length ? (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.invoiceNumber}</strong>
                  </td>
                  <td>
                    {order.productName}
                    <br />
                    <span className="muted">{order.variantName}</span>
                  </td>
                  <td>{rupiah.format(order.total)}</td>
                  <td>{order.paymentStatus}</td>
                  <td>{order.accounts.length ? `${order.accounts.length} akun` : "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>Belum ada pembelian.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
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
                  <td>{entry.status}</td>
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
                  <td>{claim.status}</td>
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
