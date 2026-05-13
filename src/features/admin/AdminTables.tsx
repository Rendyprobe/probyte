import { products } from "@/lib/catalog";
import type { DemoState, Order, Product, ProductVariant, WarrantyClaim } from "@/lib/types";
import { rupiah } from "@/app/constants";
import { maskEmail } from "@/app/state";

export function StockTable({ state }: { state: DemoState }) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Stok per varian</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Varian</th>
              <th>Tersedia</th>
              <th>Terkirim</th>
              <th>Contoh akun</th>
            </tr>
          </thead>
          <tbody>
            {products.flatMap((product) =>
              product.variants.map((variant) => {
                const stocks = state.stocks.filter((stock) => stock.variantId === variant.id);
                const available = stocks.filter((stock) => stock.status === "AVAILABLE");
                const delivered = stocks.filter((stock) => stock.status === "DELIVERED");
                const sample = available[0] ?? delivered[0];
                return (
                  <tr key={variant.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{variant.name}</td>
                    <td>{available.length}</td>
                    <td>{delivered.length}</td>
                    <td>{sample ? maskEmail(sample.email) : "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function OrdersTable({
  orders,
  onOpen,
  onPay,
  onDeliver,
  onExpire,
  onReset
}: {
  orders: Order[];
  onOpen: (invoice: string) => void;
  onPay: (invoice: string) => void;
  onDeliver: (invoice: string) => void;
  onExpire: (invoice: string) => void;
  onReset: () => void;
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Order</p>
          <h2>Transaksi terbaru</h2>
        </div>
        <button className="ghost-btn danger" type="button" onClick={onReset}>
          Reset Demo
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Produk</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Delivery</th>
              <th>Aksi</th>
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
                  <td>{order.deliveryStatus}</td>
                  <td>
                    <div className="table-actions">
                      <button className="small-btn" type="button" onClick={() => onOpen(order.invoiceNumber)}>
                        Buka
                      </button>
                      {order.paymentStatus === "WAITING_PAYMENT" ? (
                        <button className="small-btn warn" type="button" onClick={() => onPay(order.invoiceNumber)}>
                          Paid
                        </button>
                      ) : null}
                      {order.paymentStatus === "PAID" && order.deliveryStatus !== "DELIVERED" ? (
                        <button className="small-btn warn" type="button" onClick={() => onDeliver(order.invoiceNumber)}>
                          Kirim
                        </button>
                      ) : null}
                      {order.paymentStatus === "WAITING_PAYMENT" ? (
                        <button className="small-btn danger" type="button" onClick={() => onExpire(order.invoiceNumber)}>
                          Expire
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>Belum ada transaksi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RestockAlertPanel({
  alerts,
  adminEmail
}: {
  alerts: Array<{ product: Product; variant: ProductVariant; stock: number; threshold: number }>;
  adminEmail: string;
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Restock Alert</p>
          <h2>Stok menipis</h2>
        </div>
        <span className="status-badge wait">{adminEmail}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Varian</th>
              <th>Stok</th>
              <th>Threshold</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length ? (
              alerts.map((alert) => (
                <tr key={alert.variant.id}>
                  <td>
                    <strong>{alert.product.name}</strong>
                  </td>
                  <td>{alert.variant.name}</td>
                  <td>{alert.stock}</td>
                  <td>{alert.threshold}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>Tidak ada stok menipis.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function WarrantyClaimsTable({
  claims,
  orders,
  onRefund,
  onReject
}: {
  claims: WarrantyClaim[];
  orders: Order[];
  onRefund: (claimId: string) => void;
  onReject: (claimId: string) => void;
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Garansi</p>
          <h2>Klaim pelanggan</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Pelanggan</th>
              <th>Refund</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {claims.length ? (
              claims.map((claim) => {
                const order = orders.find((item) => item.invoiceNumber.toLowerCase() === claim.invoiceNumber.toLowerCase());
                return (
                  <tr key={claim.id}>
                    <td>
                      <strong>{claim.invoiceNumber}</strong>
                      <br />
                      <span className="muted">{claim.issueSummary}</span>
                    </td>
                    <td>{claim.customerWhatsapp}</td>
                    <td>{order ? rupiah.format(order.total) : "-"}</td>
                    <td>{claim.status}</td>
                    <td>
                      <div className="table-actions">
                        {claim.status === "OPEN" || claim.status === "IN_REVIEW" ? (
                          <>
                            <button className="small-btn warn" type="button" onClick={() => onRefund(claim.id)}>
                              Refund Saldo
                            </button>
                            <button className="small-btn danger" type="button" onClick={() => onReject(claim.id)}>
                              Tolak
                            </button>
                          </>
                        ) : (
                          "-"
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5}>Belum ada klaim garansi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
