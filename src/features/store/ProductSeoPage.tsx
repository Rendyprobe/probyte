import type { DemoState, Product } from "@/lib/types";
import { rupiah } from "@/app/constants";
import { availableStock, productStock } from "@/app/state";

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
  const stock = productStock(state, product.id);
  const lowestPrice = Math.min(...product.variants.map((variant) => variant.price));

  return (
    <section className="product-page">
      <div className="panel product-hero">
        <div className="product-hero-mark">
          <span className="product-mark">{product.initials}</span>
        </div>
        <div>
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name} Premium</h1>
          <p>{product.description}</p>
          <div className="tag-row">
            <span className={`stock-pill ${stock ? "" : "empty"}`}>{stock} stok</span>
            <span className="tag">Mulai {rupiah.format(lowestPrice)}</span>
            {product.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="product-actions">
            <button className="primary-btn" type="button" onClick={onCheckout}>
              Pilih Produk
            </button>
            <button className="ghost-btn" type="button" onClick={onBack}>
              Kembali
            </button>
          </div>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Varian</p>
            <h2>Paket {product.name}</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Varian</th>
                <th>Durasi</th>
                <th>Harga</th>
                <th>Stok</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <tr key={variant.id}>
                  <td>
                    <strong>{variant.name}</strong>
                  </td>
                  <td>{variant.duration}</td>
                  <td>{rupiah.format(variant.price)}</td>
                  <td>{availableStock(state, variant.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
