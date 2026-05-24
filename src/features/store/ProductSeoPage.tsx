import type { DemoState, Product } from "@/lib/types";
import { rupiah } from "@/app/constants";
import { availableStock, productStock } from "@/app/state";
import { Icon, InvoiceStatusBadge } from "@/components/common";

export function ProductSeoPage({
  product,
  state,
  onBack,
  onCheckout
}: {
  product: Product;
  state: DemoState;
  onBack: () => void;
  onCheckout: () => void;
}) {
  const stock = product.variants.some((variant) => typeof variant.stock === "number")
    ? product.variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0)
    : productStock(state, product.id);
  const lowestPrice = Math.min(...product.variants.map((variant) => variant.price));

  return (
    <section className="product-appstore-page">
      <header className="product-appstore-header">
        <button className="ghost-btn" type="button" onClick={onBack}>
          <Icon name="chevron-right" />
          Kembali ke Store
        </button>
        <div className="product-main-head">
          <div className="product-main-art">
            <ProductArtwork product={product} />
          </div>
          <div>
            <p className="eyebrow">{categoryLabel(product.category)}</p>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <div className="product-meta-badges">
              <InvoiceStatusBadge status={stock ? "READY STOCK" : "OUT OF STOCK"} />
              <InvoiceStatusBadge status="GARANSI AKTIF" />
            </div>
          </div>
        </div>
      </header>

      <div className="product-appstore-layout">
        <section className="product-tabs-column">
          <article className="product-tab-card">
            <h2>Deskripsi</h2>
            <p>
              Produk ini tersedia dalam beberapa varian akun premium dengan alur transaksi aman, invoice otomatis, dan validasi status realtime.
            </p>
          </article>

          <article className="product-tab-card">
            <h2>Benefit</h2>
            <ul className="product-benefit-list">
              <li>
                <Icon name="check" />
                Harga final langsung terlihat sebelum checkout.
              </li>
              <li>
                <Icon name="check" />
                Detail akun dikirim otomatis setelah pembayaran valid.
              </li>
              <li>
                <Icon name="check" />
                Klaim garansi diproses lewat invoice dan dashboard pelanggan.
              </li>
              <li>
                <Icon name="check" />
                Dukungan transaksi tersedia lewat support admin.
              </li>
            </ul>
          </article>

          <article className="product-tab-card">
            <h2>Varian</h2>
            <div className="variant-list">
              {product.variants.map((variant) => {
                const variantStock = typeof variant.stock === "number" ? variant.stock : availableStock(state, variant.id).length;
                return (
                  <div className={`variant-row ${variantStock ? "" : "is-empty"}`} key={variant.id}>
                    <div>
                      <strong>{variant.name}</strong>
                      <small>{variant.duration}</small>
                    </div>
                    <div>
                      <b>{rupiah.format(variant.price)}</b>
                      <small>{variantStock} stok</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="product-tab-card">
            <h2>Garansi</h2>
            <p>
              Simpan nomor invoice dan token invoice setelah checkout. Jika akun mengalami kendala, klaim dapat diajukan dari halaman profil pelanggan.
            </p>
          </article>
        </section>

        <aside className="product-checkout-sticky">
          <div className="checkout-summary-card">
            <p className="eyebrow">Checkout Panel</p>
            <h3>{product.name}</h3>
            <div className="summary-row">
              <span>Harga mulai</span>
              <strong>{rupiah.format(lowestPrice)}</strong>
            </div>
            <div className="summary-row">
              <span>Stok</span>
              <strong>{stock}</strong>
            </div>
            <div className="summary-row">
              <span>Durasi</span>
              <strong>30 hari</strong>
            </div>
            <button className="primary-btn" type="button" onClick={onCheckout}>
              <Icon name="card" />
              Lanjut Checkout
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ProductArtwork({ product }: { product: Product }) {
  return (
    <span className="product-art appstore-art" aria-hidden="true">
      {product.imageUrl ? (
        <img
          alt=""
          decoding="async"
          loading="eager"
          referrerPolicy="no-referrer"
          src={product.imageUrl}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    AI: "AI Tools",
    Editing: "Editing",
    Learning: "Belajar",
    Music: "Musik",
    Productivity: "Produktivitas",
    Streaming: "Streaming",
    Utility: "Utilitas",
    "Video Platform": "Video"
  };

  return labels[category] ?? category;
}
