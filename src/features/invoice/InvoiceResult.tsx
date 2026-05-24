import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import { rupiah } from "@/app/constants";
import { formatDate, paymentLabel } from "@/app/state";
import { Icon, InvoiceStatusBadge } from "@/components/common";

export function InvoiceResult({
  order,
  invoice,
  onPay,
  onCopy,
  onOpenProfile,
  onRefresh,
  onCopyLink,
  onSendReceipt,
  onWhatsAppSupport
}: {
  order: Order | null;
  invoice: string;
  onPay: (invoice: string) => void;
  onCopy: (text: string) => void;
  onOpenProfile: () => void;
  onRefresh: (invoice: string) => void;
  onCopyLink: (invoice: string) => void;
  onSendReceipt: (invoice: string) => void;
  onWhatsAppSupport: (order: Order) => void;
}) {
  const expiryText = useExpiryText(order?.expiredAt ?? "");
  const [copiedKey, setCopiedKey] = useState("");

  function copyWithFeedback(key: string, value: string) {
    onCopy(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => (current === key ? "" : current)), 1600);
  }

  if (!invoice) {
    return (
      <div className="empty-state invoice-empty">
        <span className="empty-icon">
          <Icon name="invoice" />
        </span>
        <strong>Masukkan nomor invoice</strong>
        <p>Pakai nomor invoice + token checkout untuk melihat transaksi.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="empty-state invoice-empty">
        <span className="empty-icon">
          <Icon name="search" />
        </span>
        <strong>Invoice tidak ditemukan</strong>
        <p>Periksa nomor invoice dan token transaksi.</p>
      </div>
    );
  }

  const hasAccounts = order.deliveryStatus === "DELIVERED" && order.accounts.length > 0;

  return (
    <article className="receipt-card">
      <div className="receipt-head">
        <p className="eyebrow">Digital Receipt</p>
        <h2>{order.productName}</h2>
        <button className="receipt-number" type="button" onClick={() => copyWithFeedback("invoice", order.invoiceNumber)}>
          <span>{order.invoiceNumber}</span>
          <Icon name={copiedKey === "invoice" ? "check" : "copy"} />
        </button>
        <div className="receipt-status-row">
          <InvoiceStatusBadge status={order.paymentStatus} />
          <InvoiceStatusBadge status={order.deliveryStatus} />
        </div>
      </div>

      <div className="receipt-perforation" aria-hidden="true" />

      <div className="receipt-grid">
        <DetailItem label="Varian" value={order.variantName} />
        <DetailItem label="Qty" value={order.qty} />
        <DetailItem label="Metode" value={paymentLabel(order.paymentMethod)} />
        <DetailItem label="Dibuat" value={formatDate(order.createdAt)} />
        <DetailItem label="Expired" value={expiryText} />
        <DetailItem label="Subtotal" value={rupiah.format(order.subtotal)} />
        <DetailItem label="Diskon" value={order.discount ? `-${rupiah.format(order.discount)}` : "-"} />
        <DetailItem label="Biaya" value={rupiah.format(order.paymentFee)} />
        <DetailItem label="Total" value={rupiah.format(order.total)} />
      </div>

      <div className="receipt-action-row">
        {order.paymentStatus === "WAITING_PAYMENT" && order.paymentMethod !== "WALLET" ? (
          <button className="primary-btn" type="button" onClick={() => onPay(order.invoiceNumber)}>
            <Icon name="card" />
            Bayar Sekarang
          </button>
        ) : null}
        <button className="ghost-btn" type="button" onClick={() => onRefresh(order.invoiceNumber)}>
          <Icon name="refresh" />
          Cek Status
        </button>
        <button className="ghost-btn" type="button" onClick={() => onCopyLink(order.invoiceNumber)}>
          <Icon name="copy" />
          Copy Link
        </button>
        <button className="ghost-btn" type="button" onClick={() => onSendReceipt(order.invoiceNumber)}>
          <Icon name="invoice" />
          Kirim Receipt
        </button>
      </div>

      {order.paymentStatus === "WAITING_PAYMENT" ? (
        <div className="receipt-instructions">
          <strong>Instruksi Pembayaran</strong>
          <p>1. Tekan tombol Bayar Sekarang.</p>
          <p>2. Selesaikan pembayaran sebelum invoice expired.</p>
          <p>3. Klik Cek Status setelah pembayaran berhasil.</p>
        </div>
      ) : null}

      {hasAccounts ? (
        <section className="secure-vault-card">
          <div className="vault-top">
            <div>
              <p className="eyebrow">Secure Vault</p>
              <h3>Credential Akun</h3>
            </div>
            <InvoiceStatusBadge status="DELIVERED" />
          </div>
          <div className="vault-list">
            {order.accounts.map((account, index) => (
              <VaultCredentialRow account={account} copiedKey={copiedKey} index={index} onCopy={copyWithFeedback} key={account.stockId} />
            ))}
          </div>
          <div className="vault-warning">
            <Icon name="shield" />
            Simpan data akun di tempat aman. Gunakan invoice ini jika perlu bantuan atau klaim.
          </div>
          <button className="ghost-btn" type="button" onClick={onOpenProfile}>
            <Icon name="star" />
            Tulis Ulasan
          </button>
        </section>
      ) : (
        <div className="receipt-instructions">
          <strong>Credential belum tersedia</strong>
          <p>Detail akun akan muncul setelah pembayaran terverifikasi dan order selesai diproses.</p>
        </div>
      )}

      {order.history.length ? (
        <section className="invoice-timeline">
          <p className="eyebrow">Timeline</p>
          <ol>
            {order.history.map((item, index) => (
              <li key={`${item.at}-${index}`}>
                <span>{formatDate(item.at)}</span>
                <strong>{item.text}</strong>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <button className="ghost-btn" type="button" onClick={() => onWhatsAppSupport(order)}>
        <Icon name="support" />
        Hubungi Support WA
      </button>
    </article>
  );
}

function VaultCredentialRow({
  account,
  index,
  copiedKey,
  onCopy
}: {
  account: { stockId: string; email: string; password: string };
  index: number;
  copiedKey: string;
  onCopy: (key: string, value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const maskedPassword = "•".repeat(Math.max(8, account.password.length));

  return (
    <article className="vault-secret-item">
      <div className="vault-secret-head">
        <strong>Akun {index + 1}</strong>
      </div>
      <label>
        <span>Email</span>
        <div className="vault-field">
          <strong>{account.email}</strong>
          <button className="copy-btn" type="button" onClick={() => onCopy(`${account.stockId}-email`, account.email)}>
            {copiedKey === `${account.stockId}-email` ? "Disalin" : "Copy"}
          </button>
        </div>
      </label>
      <label>
        <span>Password</span>
        <div className="vault-field">
          <strong>{visible ? account.password : maskedPassword}</strong>
          <div className="vault-field-actions">
            <button className="copy-btn" type="button" onClick={() => onCopy(`${account.stockId}-password`, account.password)}>
              {copiedKey === `${account.stockId}-password` ? "Disalin" : "Copy"}
            </button>
            <button className="copy-btn" type="button" onClick={() => setVisible((value) => !value)}>
              {visible ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </label>
    </article>
  );
}

function useExpiryText(expiredAt: string) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresAt = new Date(expiredAt).getTime();
  const remaining = expiresAt - now;
  if (!Number.isFinite(expiresAt)) return "-";
  if (remaining <= 0) return "Sudah expired";

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
