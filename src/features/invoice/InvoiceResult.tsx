import type { Order } from "@/lib/types";
import { rupiah } from "@/app/constants";
import { paymentLabel } from "@/app/state";

export function InvoiceResult({
  order,
  invoice,
  onPay,
  onCopy
}: {
  order: Order | null;
  invoice: string;
  onPay: (invoice: string) => void;
  onCopy: (text: string) => void;
}) {
  if (!invoice) {
    return <div className="empty-results">Masukkan nomor invoice untuk melihat transaksi.</div>;
  }

  if (!order) {
    return <div className="empty-results">Invoice tidak ditemukan.</div>;
  }

  const payClass = order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "WAITING_PAYMENT" ? "wait" : "fail";
  const deliveryClass = order.deliveryStatus === "DELIVERED" ? "success" : order.deliveryStatus === "NEED_RESTOCK" ? "fail" : "wait";
  const hasAccounts = order.deliveryStatus === "DELIVERED" && order.accounts.length > 0;

  return (
    <article className="invoice-card">
      <div className="invoice-card-head">
        <div>
          <p className="eyebrow">Invoice</p>
          <h1>{order.productName}</h1>
          <p className="invoice-number">{order.invoiceNumber}</p>
        </div>
        <div className="tag-row">
          <span className={`status-badge ${payClass}`}>{order.paymentStatus}</span>
          <span className={`status-badge ${deliveryClass}`}>{order.deliveryStatus}</span>
        </div>
      </div>

      <div className="detail-grid">
        <DetailItem label="Varian" value={order.variantName} />
        <DetailItem label="Qty" value={order.qty} />
        <DetailItem label="WhatsApp" value={order.customerWhatsapp} />
        <DetailItem label="Metode" value={paymentLabel(order.paymentMethod)} />
        <DetailItem label="Subtotal" value={rupiah.format(order.subtotal)} />
        <DetailItem label="Diskon" value={order.discount ? rupiah.format(order.discount) : "-"} />
        <DetailItem label="Total" value={rupiah.format(order.total)} />
      </div>

      {order.paymentStatus === "WAITING_PAYMENT" && order.paymentMethod !== "WALLET" ? (
        <button className="primary-btn" type="button" onClick={() => onPay(order.invoiceNumber)}>
          Bayar via Xendit
        </button>
      ) : null}

      {order.deliveryStatus === "NEED_RESTOCK" ? (
        <div className="detail-item">
          <span>Status</span>
          <strong>Menunggu restock atau penggantian akun dari admin.</strong>
        </div>
      ) : null}

      {hasAccounts ? (
        <div>
          <p className="eyebrow">Detail akun</p>
          <div className="account-list">
            {order.accounts.map((account, index) => (
              <div className="account-card" key={account.stockId}>
                <div>
                  <span>Akun {index + 1}</span>
                  <strong>{account.email}</strong>
                  <span>Password</span>
                  <strong>{account.password}</strong>
                </div>
                <button className="copy-btn" type="button" onClick={() => onCopy(`${account.email} | ${account.password}`)}>
                  Salin
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="detail-item">
          <span>Detail akun</span>
          <strong>Detail akun muncul setelah pembayaran berhasil.</strong>
        </div>
      )}
    </article>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
