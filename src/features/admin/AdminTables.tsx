import { type FormEvent, useMemo, useState } from "react";
import { products } from "@/lib/catalog";
import type { DemoState, Order, Product, ProductCategory, ProductVariant, WalletLedgerEntry, WarrantyClaim } from "@/lib/types";
import { rupiah } from "@/app/constants";
import { formatDate, maskEmail } from "@/app/state";
import type { AdminAuditLogRow, AdminProductRow, AdminProductVariantRow, AdminPromoRow, AdminWalletSummaryRow } from "@/app/types";
import { InvoiceStatusBadge, MetricRow } from "@/components/common";

export function StockTable({ state, catalogProducts = products }: { state: DemoState; catalogProducts?: Product[] }) {
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
            {catalogProducts.flatMap((product) =>
              product.variants.map((variant) => {
                const stocks = state.stocks.filter((stock) => stock.variantId === variant.id);
                const remoteAvailable = typeof variant.stock === "number" ? variant.stock : null;
                const available = stocks.filter((stock) => stock.status === "AVAILABLE");
                const delivered = stocks.filter((stock) => stock.status === "DELIVERED");
                const sample = available[0] ?? delivered[0];
                return (
                  <tr key={variant.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{variant.name}</td>
                    <td>{remoteAvailable ?? available.length}</td>
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
  demoMode,
  orders,
  onOpen,
  onPay,
  onDeliver,
  onExpire,
  onReplace,
  onExport,
  onReset
}: {
  demoMode: boolean;
  orders: Order[];
  onOpen: (invoice: string) => void;
  onPay: (invoice: string) => void;
  onDeliver: (invoice: string) => void;
  onExpire: (invoice: string) => void;
  onReplace: (invoice: string) => void;
  onExport: () => void;
  onReset: () => void;
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Order</p>
          <h2>Transaksi terbaru</h2>
        </div>
        {demoMode ? (
          <button className="ghost-btn danger" type="button" onClick={onReset}>
            Reset Demo
          </button>
        ) : null}
        <button className="ghost-btn" type="button" onClick={onExport}>
          Export CSV
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
                  <td><InvoiceStatusBadge status={order.paymentStatus} /></td>
                  <td><InvoiceStatusBadge status={order.deliveryStatus} /></td>
                  <td>
                    <div className="table-actions">
                      <button className="small-btn" type="button" onClick={() => onOpen(order.invoiceNumber)}>
                        Buka
                      </button>
                      {demoMode && order.paymentStatus === "WAITING_PAYMENT" ? (
                        <button className="small-btn warn" type="button" onClick={() => onPay(order.invoiceNumber)}>
                          Paid
                        </button>
                      ) : null}
                      {demoMode && order.paymentStatus === "PAID" && order.deliveryStatus !== "DELIVERED" ? (
                        <button className="small-btn warn" type="button" onClick={() => onDeliver(order.invoiceNumber)}>
                          Kirim
                        </button>
                      ) : null}
                      {order.paymentStatus === "PAID" && (order.deliveryStatus === "DELIVERED" || order.deliveryStatus === "NEED_RESTOCK") ? (
                        <button className="small-btn warn" type="button" onClick={() => onReplace(order.invoiceNumber)}>
                          Ganti Akun
                        </button>
                      ) : null}
                      {demoMode && order.paymentStatus === "WAITING_PAYMENT" ? (
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
  adminEmail,
  onSend
}: {
  alerts: Array<{ product: Product; variant: ProductVariant; stock: number; threshold: number }>;
  adminEmail: string;
  onSend?: () => void;
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Restock Alert</p>
          <h2>Stok menipis</h2>
        </div>
        <div className="table-actions">
          <span className="status-badge wait">{adminEmail}</span>
          {onSend ? (
            <button className="small-btn warn" type="button" onClick={onSend}>
              Kirim Alert
            </button>
          ) : null}
        </div>
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
  onReview,
  onRefund,
  onReject
}: {
  claims: WarrantyClaim[];
  orders: Order[];
  onReview: (claimId: string) => void;
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
                    <td><InvoiceStatusBadge status={claim.status} /></td>
                    <td>
                      <div className="table-actions">
                        {claim.status === "OPEN" || claim.status === "IN_REVIEW" ? (
                          <>
                            {claim.status === "OPEN" ? (
                              <button className="small-btn" type="button" onClick={() => onReview(claim.id)}>
                                Review
                              </button>
                            ) : null}
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

const productCategories: ProductCategory[] = ["Streaming", "Music", "Productivity", "AI", "Editing", "Learning", "Video Platform", "Utility"];

type AdminPayload = Record<string, string | number | boolean | null>;

export function ProductManager({
  products: adminProducts,
  onCreateProduct,
  onUpdateProduct,
  onCreateVariant,
  onUpdateVariant
}: {
  products: AdminProductRow[];
  onCreateProduct: (payload: AdminPayload) => Promise<void>;
  onUpdateProduct: (id: string, payload: AdminPayload) => Promise<void>;
  onCreateVariant: (payload: AdminPayload) => Promise<void>;
  onUpdateVariant: (id: string, payload: AdminPayload) => Promise<void>;
}) {
  const firstProductId = adminProducts[0]?.id ?? "";
  const [productDraft, setProductDraft] = useState({
    id: "",
    slug: "",
    name: "",
    category: "Streaming" as ProductCategory,
    description: "",
    iconLabel: "",
    seoTitle: "",
    seoDescription: "",
    isActive: true
  });
  const [variantDraft, setVariantDraft] = useState({
    id: "",
    productId: firstProductId,
    name: "",
    durationDays: 30,
    costPrice: 0,
    sellPrice: 0,
    lowStockThreshold: 2,
    isActive: true
  });
  const [editingVariantId, setEditingVariantId] = useState("");

  const variants = useMemo(
    () => adminProducts.flatMap((product) => (product.product_variants ?? product.variants ?? []).map((variant) => ({ ...variant, productName: product.name }))),
    [adminProducts]
  );

  function updateProductDraft(patch: Partial<typeof productDraft>) {
    setProductDraft((draft) => ({ ...draft, ...patch }));
  }

  function updateVariantDraft(patch: Partial<typeof variantDraft>) {
    setVariantDraft((draft) => ({ ...draft, ...patch }));
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateProduct(productDraft);
    setProductDraft({ id: "", slug: "", name: "", category: "Streaming", description: "", iconLabel: "", seoTitle: "", seoDescription: "", isActive: true });
  }

  async function submitVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...variantDraft, productId: variantDraft.productId || firstProductId };
    if (editingVariantId) {
      await onUpdateVariant(editingVariantId, payload);
    } else {
      await onCreateVariant(payload);
    }
    setEditingVariantId("");
    setVariantDraft({ id: "", productId: firstProductId, name: "", durationDays: 30, costPrice: 0, sellPrice: 0, lowStockThreshold: 2, isActive: true });
  }

  function editVariant(variant: AdminProductVariantRow & { productName: string }) {
    setEditingVariantId(variant.id);
    setVariantDraft({
      id: variant.id,
      productId: variant.product_id,
      name: variant.name,
      durationDays: variant.duration_days,
      costPrice: variant.cost_price,
      sellPrice: variant.sell_price,
      lowStockThreshold: variant.low_stock_threshold,
      isActive: variant.is_active
    });
  }

  return (
    <section className="admin-stack">
      <div className="admin-grid">
        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Produk</p>
              <h2>Tambah produk</h2>
            </div>
          </div>
          <form className="stock-form" onSubmit={submitProduct}>
            <div className="split-fields two">
              <label className="field">
                <span>ID</span>
                <input value={productDraft.id} onChange={(event) => updateProductDraft({ id: event.target.value })} placeholder="netflix" required />
              </label>
              <label className="field">
                <span>Slug</span>
                <input value={productDraft.slug} onChange={(event) => updateProductDraft({ slug: event.target.value })} placeholder="netflix" required />
              </label>
            </div>
            <label className="field">
              <span>Nama</span>
              <input value={productDraft.name} onChange={(event) => updateProductDraft({ name: event.target.value })} placeholder="Netflix" required />
            </label>
            <div className="split-fields two">
              <label className="field">
                <span>Kategori</span>
                <select value={productDraft.category} onChange={(event) => updateProductDraft({ category: event.target.value as ProductCategory })}>
                  {productCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Icon label</span>
                <input value={productDraft.iconLabel} onChange={(event) => updateProductDraft({ iconLabel: event.target.value.toUpperCase() })} placeholder="NF" required />
              </label>
            </div>
            <label className="field">
              <span>Deskripsi</span>
              <textarea rows={3} value={productDraft.description} onChange={(event) => updateProductDraft({ description: event.target.value })} required />
            </label>
            <label className="field inline-check">
              <input type="checkbox" checked={productDraft.isActive} onChange={(event) => updateProductDraft({ isActive: event.target.checked })} />
              <span>Aktif di storefront</span>
            </label>
            <button className="primary-btn" type="submit">
              Tambah Produk
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Varian</p>
              <h2>{editingVariantId ? "Update varian" : "Tambah varian"}</h2>
            </div>
          </div>
          <form className="stock-form" onSubmit={submitVariant}>
            <label className="field">
              <span>Produk</span>
              <select value={variantDraft.productId || firstProductId} onChange={(event) => updateVariantDraft({ productId: event.target.value })}>
                {adminProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="split-fields two">
              <label className="field">
                <span>ID varian</span>
                <input disabled={Boolean(editingVariantId)} value={variantDraft.id} onChange={(event) => updateVariantDraft({ id: event.target.value })} placeholder="netflix-30d" required />
              </label>
              <label className="field">
                <span>Nama</span>
                <input value={variantDraft.name} onChange={(event) => updateVariantDraft({ name: event.target.value })} placeholder="Private 1 Bulan" required />
              </label>
            </div>
            <div className="split-fields three">
              <label className="field">
                <span>Harga modal</span>
                <input min={0} type="number" value={variantDraft.costPrice} onChange={(event) => updateVariantDraft({ costPrice: Number(event.target.value) })} />
              </label>
              <label className="field">
                <span>Harga jual</span>
                <input min={0} type="number" value={variantDraft.sellPrice} onChange={(event) => updateVariantDraft({ sellPrice: Number(event.target.value) })} required />
              </label>
              <label className="field">
                <span>Alert stok</span>
                <input min={0} type="number" value={variantDraft.lowStockThreshold} onChange={(event) => updateVariantDraft({ lowStockThreshold: Number(event.target.value) })} />
              </label>
            </div>
            <label className="field inline-check">
              <input type="checkbox" checked={variantDraft.isActive} onChange={(event) => updateVariantDraft({ isActive: event.target.checked })} />
              <span>Varian aktif</span>
            </label>
            <div className="table-actions">
              <button className="primary-btn" type="submit">
                {editingVariantId ? "Update Varian" : "Tambah Varian"}
              </button>
              {editingVariantId ? (
                <button className="ghost-btn" type="button" onClick={() => setEditingVariantId("")}>
                  Batal Edit
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Katalog admin</p>
            <h2>Produk dan varian</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Status</th>
                <th>Varian</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {adminProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                    <br />
                    <span className="muted">{product.slug}</span>
                  </td>
                  <td>{product.category}</td>
                  <td><InvoiceStatusBadge status={product.is_active ? "Aktif" : "Nonaktif"} /></td>
                  <td>{(product.product_variants ?? product.variants ?? []).length}</td>
                  <td>
                    <button className="small-btn" type="button" onClick={() => onUpdateProduct(product.id, { isActive: !product.is_active })}>
                      {product.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              ))}
              {variants.map((variant) => (
                <tr key={variant.id}>
                  <td>
                    <span className="muted">{variant.productName}</span>
                    <br />
                    <strong>{variant.name}</strong>
                  </td>
                  <td>{variant.duration_days} hari</td>
                  <td><InvoiceStatusBadge status={variant.is_active ? "Aktif" : "Nonaktif"} /></td>
                  <td>
                    {rupiah.format(variant.sell_price)} · {variant.stock ?? 0} stok
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="small-btn" type="button" onClick={() => editVariant(variant)}>
                        Edit
                      </button>
                      <button className="small-btn" type="button" onClick={() => onUpdateVariant(variant.id, { isActive: !variant.is_active })}>
                        {variant.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export function PromoManager({
  promos,
  onCreatePromo,
  onUpdatePromo
}: {
  promos: AdminPromoRow[];
  onCreatePromo: (payload: AdminPayload) => Promise<void>;
  onUpdatePromo: (code: string, payload: AdminPayload) => Promise<void>;
}) {
  const [editingCode, setEditingCode] = useState("");
  const [draft, setDraft] = useState({
    code: "",
    label: "",
    type: "PERCENT",
    value: 10,
    minSubtotal: 0,
    maxDiscount: "",
    usageLimit: "",
    isActive: true
  });

  function patchDraft(patch: Partial<typeof draft>) {
    setDraft((item) => ({ ...item, ...patch }));
  }

  function editPromo(promo: AdminPromoRow) {
    setEditingCode(promo.code);
    setDraft({
      code: promo.code,
      label: promo.label,
      type: promo.type,
      value: promo.value,
      minSubtotal: promo.min_subtotal,
      maxDiscount: promo.max_discount?.toString() ?? "",
      usageLimit: promo.usage_limit?.toString() ?? "",
      isActive: promo.is_active
    });
  }

  async function submitPromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      code: draft.code,
      label: draft.label,
      type: draft.type,
      value: Number(draft.value),
      minSubtotal: Number(draft.minSubtotal),
      maxDiscount: draft.maxDiscount === "" ? null : Number(draft.maxDiscount),
      usageLimit: draft.usageLimit === "" ? null : Number(draft.usageLimit),
      isActive: draft.isActive
    };
    if (editingCode) await onUpdatePromo(editingCode, payload);
    else await onCreatePromo(payload);
    setEditingCode("");
    setDraft({ code: "", label: "", type: "PERCENT", value: 10, minSubtotal: 0, maxDiscount: "", usageLimit: "", isActive: true });
  }

  return (
    <section className="admin-stack">
      <div className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Voucher</p>
            <h2>{editingCode ? "Update promo" : "Tambah promo"}</h2>
          </div>
        </div>
        <form className="stock-form compact-form" onSubmit={submitPromo}>
          <div className="split-fields three">
            <label className="field">
              <span>Kode</span>
              <input value={draft.code} onChange={(event) => patchDraft({ code: event.target.value.toUpperCase() })} placeholder="PROBYTE10" required />
            </label>
            <label className="field">
              <span>Label</span>
              <input value={draft.label} onChange={(event) => patchDraft({ label: event.target.value })} placeholder="Diskon 10%" required />
            </label>
            <label className="field">
              <span>Tipe</span>
              <select value={draft.type} onChange={(event) => patchDraft({ type: event.target.value })}>
                <option value="PERCENT">Persen</option>
                <option value="FIXED">Nominal</option>
              </select>
            </label>
          </div>
          <div className="split-fields four">
            <label className="field">
              <span>Value</span>
              <input min={1} type="number" value={draft.value} onChange={(event) => patchDraft({ value: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>Min belanja</span>
              <input min={0} type="number" value={draft.minSubtotal} onChange={(event) => patchDraft({ minSubtotal: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>Max diskon</span>
              <input min={0} type="number" value={draft.maxDiscount} onChange={(event) => patchDraft({ maxDiscount: event.target.value })} placeholder="Opsional" />
            </label>
            <label className="field">
              <span>Limit pakai</span>
              <input min={1} type="number" value={draft.usageLimit} onChange={(event) => patchDraft({ usageLimit: event.target.value })} placeholder="Opsional" />
            </label>
          </div>
          <label className="field inline-check">
            <input type="checkbox" checked={draft.isActive} onChange={(event) => patchDraft({ isActive: event.target.checked })} />
            <span>Promo aktif</span>
          </label>
          <div className="table-actions">
            <button className="primary-btn" type="submit">
              {editingCode ? "Update Promo" : "Tambah Promo"}
            </button>
            {editingCode ? (
              <button className="ghost-btn" type="button" onClick={() => setEditingCode("")}>
                Batal Edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Diskon</th>
                <th>Syarat</th>
                <th>Pakai</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {promos.length ? (
                promos.map((promo) => (
                  <tr key={promo.code}>
                    <td>
                      <strong>{promo.code}</strong>
                      <br />
                      <span className="muted">{promo.label}</span>
                    </td>
                    <td>{promo.type === "PERCENT" ? `${promo.value}%` : rupiah.format(promo.value)}</td>
                    <td>
                      Min {rupiah.format(promo.min_subtotal)}
                      <br />
                      <span className="muted">Max {promo.max_discount ? rupiah.format(promo.max_discount) : "-"}</span>
                    </td>
                    <td>
                      {promo.used_count}
                      {promo.usage_limit ? `/${promo.usage_limit}` : ""}
                    </td>
                    <td><InvoiceStatusBadge status={promo.is_active ? "Aktif" : "Nonaktif"} /></td>
                    <td>
                      <div className="table-actions">
                        <button className="small-btn" type="button" onClick={() => editPromo(promo)}>
                          Edit
                        </button>
                        <button className="small-btn" type="button" onClick={() => onUpdatePromo(promo.code, { isActive: !promo.is_active })}>
                          {promo.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>Belum ada promo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export function WalletAdminPanel({
  summary,
  ledger,
  onAdjustWallet
}: {
  summary: AdminWalletSummaryRow[];
  ledger: WalletLedgerEntry[];
  onAdjustWallet: (payload: { userId: string; direction: "CREDIT" | "DEBIT"; amount: number; note: string }) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    userId: "",
    direction: "CREDIT" as "CREDIT" | "DEBIT",
    amount: 50000,
    note: ""
  });

  const totals = useMemo(
    () =>
      summary.reduce(
        (acc, item) => ({
          balance: acc.balance + item.balance,
          pending: acc.pending + item.pending_topup,
          credit: acc.credit + item.settled_credit,
          debit: acc.debit + item.settled_debit
        }),
        { balance: 0, pending: 0, credit: 0, debit: 0 }
      ),
    [summary]
  );

  function patchDraft(patch: Partial<typeof draft>) {
    setDraft((item) => ({ ...item, ...patch }));
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAdjustWallet({
      userId: draft.userId.trim(),
      direction: draft.direction,
      amount: Math.floor(Number(draft.amount) || 0),
      note: draft.note.trim()
    });
    setDraft((item) => ({ ...item, amount: 50000, note: "" }));
  }

  return (
    <section className="admin-stack">
      <MetricRow
        items={[
          { label: "Total Saldo", value: rupiah.format(totals.balance) },
          { label: "Top up Pending", value: rupiah.format(totals.pending) },
          { label: "Kredit Settled", value: rupiah.format(totals.credit) },
          { label: "Debit Settled", value: rupiah.format(totals.debit) }
        ]}
      />

      <div className="admin-grid">
        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Saldo pelanggan</p>
              <h2>Tambah atau kurangi saldo</h2>
            </div>
          </div>
          <form className="stock-form" onSubmit={submitAdjustment}>
            <label className="field">
              <span>User ID</span>
              <input value={draft.userId} onChange={(event) => patchDraft({ userId: event.target.value })} placeholder="UUID pelanggan Supabase" required />
            </label>
            <div className="split-fields two">
              <label className="field">
                <span>Aksi</span>
                <select value={draft.direction} onChange={(event) => patchDraft({ direction: event.target.value as "CREDIT" | "DEBIT" })}>
                  <option value="CREDIT">Tambah saldo</option>
                  <option value="DEBIT">Kurangi saldo</option>
                </select>
              </label>
              <label className="field">
                <span>Nominal</span>
                <input min={1} step={1000} type="number" value={draft.amount} onChange={(event) => patchDraft({ amount: Number(event.target.value) })} />
              </label>
            </div>
            <label className="field">
              <span>Catatan admin</span>
              <textarea rows={3} value={draft.note} onChange={(event) => patchDraft({ note: event.target.value })} placeholder="Manual refund, bonus, koreksi transaksi..." />
            </label>
            <button className="primary-btn" type="submit">
              Simpan Mutasi
            </button>
          </form>
        </div>

        <section className="panel table-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Customer wallet</p>
              <h2>Ringkasan saldo</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Saldo</th>
                  <th>Masuk</th>
                  <th>Keluar</th>
                  <th>Pending</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {summary.length ? (
                  summary.map((item) => (
                    <tr key={item.user_id}>
                      <td>
                        <code>{item.user_id}</code>
                        <br />
                        <span className="muted">{formatDate(item.last_activity)}</span>
                      </td>
                      <td>{rupiah.format(item.balance)}</td>
                      <td>
                        {rupiah.format(item.settled_credit)}
                        <br />
                        <span className="muted">Refund {rupiah.format(item.refund)}</span>
                      </td>
                      <td>{rupiah.format(item.settled_debit)}</td>
                      <td>{rupiah.format(item.pending_topup)}</td>
                      <td>
                        <button className="small-btn" type="button" onClick={() => patchDraft({ userId: item.user_id })}>
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>Belum ada saldo pelanggan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Ledger</p>
            <h2>Mutasi saldo terbaru</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>User</th>
                <th>Tipe</th>
                <th>Nominal</th>
                <th>Status</th>
                <th>Referensi</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length ? (
                ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>
                      <code>{entry.userId}</code>
                    </td>
                    <td>{entry.kind}</td>
                    <td>
                      {entry.kind === "PAYMENT" ? "-" : "+"}
                      {rupiah.format(entry.amount)}
                    </td>
                    <td><InvoiceStatusBadge status={entry.status} /></td>
                    <td>
                      {entry.invoiceNumber ?? entry.paymentReference ?? "-"}
                      <br />
                      <span className="muted">{entry.note || "-"}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>Belum ada mutasi saldo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export function AuditLogTable({ logs }: { logs: AdminAuditLogRow[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Audit</p>
          <h2>Aktivitas admin</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aksi</th>
              <th>Entity</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.length ? (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.created_at))}</td>
                  <td>
                    <strong>{log.action}</strong>
                  </td>
                  <td>
                    {log.entity_type}
                    <br />
                    <span className="muted">{log.entity_id}</span>
                  </td>
                  <td>
                    <code>{JSON.stringify(log.metadata_json)}</code>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>Belum ada audit log.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
