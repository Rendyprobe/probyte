import { FormEvent, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Order, Product, PromoCode, WalletLedgerEntry } from "@/lib/types";
import { MIN_TOP_UP, rupiah } from "@/app/constants";
import { formatDate } from "@/app/state";
import { CommandSearch, EmptyState, Icon, InvoiceStatusBadge, LoadingSkeleton, LogoMark, type IconName } from "@/components/common";
import { InvoiceResult } from "@/features/invoice/InvoiceResult";

export type AppNavItem = {
  id: string;
  label: string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
};

export type SidebarCategoryItem = {
  key: string;
  label: string;
  icon: IconName;
  count: number;
};

export type ProductSortOption = "popular" | "price-asc" | "price-desc" | "stock-desc" | "name-asc";

export type RankingEntry = {
  rank: number;
  name: string;
  totalAmount: number;
  transactionCount: number;
  points: number;
  badge: string;
};

export function AppSidebar({
  menuItems,
  onInvoice
}: {
  menuItems: AppNavItem[];
  onInvoice: () => void;
}) {
  return (
    <div className="store-sidebar app-sidebar">
      <button className="store-logo" type="button" onClick={menuItems[0]?.onClick}>
        <LogoMark />
        <span>
          <strong>ProByte</strong>
          <small>Marketplace Digital</small>
        </span>
      </button>

      <div className="sidebar-nav-scroll">
        <nav className="side-nav" aria-label="Menu utama">
          {menuItems.map((item) => (
            <button className={`side-nav-item ${item.active ? "is-active" : ""}`} key={item.id} type="button" onClick={item.onClick}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="support-mini">
        <strong>Cek pembayaran cepat</strong>
        <p>Masuk ke menu invoice kapan pun untuk lihat status transaksi dan detail akun.</p>
        <button className="secondary-btn" type="button" onClick={onInvoice}>
          <Icon name="invoice" />
          Buka Invoice
        </button>
      </div>
    </div>
  );
}

export function MobileSidebarDrawer({
  open,
  menuItems,
  onClose
}: {
  open: boolean;
  menuItems: AppNavItem[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="mobile-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigasi utama" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-drawer-head">
          <strong>Menu ProByte</strong>
          <button className="ghost-btn icon-btn" type="button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <nav className="mobile-drawer-nav">
          {menuItems.map((item) => (
            <button
              className={`side-nav-item ${item.active ? "is-active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}

export function AppTopbar({
  title,
  description,
  userLabel,
  themeMode,
  onOpenMenu,
  onThemeToggle
}: {
  title: string;
  description: string;
  userLabel: string;
  themeMode: "light" | "dark";
  onOpenMenu: () => void;
  onThemeToggle: () => void;
}) {
  return (
    <header className="app-topbar">
      <div className="app-topbar-main">
        <button className="ghost-btn icon-btn app-menu-toggle" type="button" onClick={onOpenMenu}>
          <Icon name="menu" />
        </button>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className="app-topbar-actions">
        <button className="theme-toggle" type="button" onClick={onThemeToggle} aria-pressed={themeMode === "dark"}>
          <Icon name="spark" />
          <span>{themeMode === "dark" ? "Mode Terang" : "Mode Neon"}</span>
        </button>
        <div className="app-topbar-user">
          <Icon name="user" />
          <span>{userLabel}</span>
        </div>
      </div>
    </header>
  );
}

export function SearchBar({
  query,
  onChange,
  onClear
}: {
  query: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return <CommandSearch query={query} onQueryChange={onChange} onClear={onClear} placeholder="Cari produk premium..." />;
}

export function SortDropdown({
  value,
  onChange
}: {
  value: ProductSortOption;
  onChange: (value: ProductSortOption) => void;
}) {
  return (
    <label className="field sort-dropdown">
      <span>Urutkan</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ProductSortOption)}>
        <option value="popular">Paling populer</option>
        <option value="price-asc">Harga terendah</option>
        <option value="price-desc">Harga tertinggi</option>
        <option value="stock-desc">Stok terbanyak</option>
        <option value="name-asc">Nama A-Z</option>
      </select>
    </label>
  );
}

export function CategoryNav({
  categories,
  activeCategory,
  onPick
}: {
  categories: SidebarCategoryItem[];
  activeCategory: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="product-category-nav">
      {categories.map((item) => (
        <button
          className={`filter-chip ${activeCategory === item.key ? "is-active" : ""}`}
          key={item.key}
          type="button"
          onClick={() => onPick(item.key)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
          <small>{item.count}</small>
        </button>
      ))}
    </div>
  );
}

export function ProductFilters({
  query,
  sort,
  categories,
  activeCategory,
  onQueryChange,
  onQueryClear,
  onCategoryPick,
  onSortChange
}: {
  query: string;
  sort: ProductSortOption;
  categories: SidebarCategoryItem[];
  activeCategory: string;
  onQueryChange: (value: string) => void;
  onQueryClear: () => void;
  onCategoryPick: (value: string) => void;
  onSortChange: (value: ProductSortOption) => void;
}) {
  return (
    <section className="panel product-filters">
      <SearchBar query={query} onChange={onQueryChange} onClear={onQueryClear} />
      <SortDropdown value={sort} onChange={onSortChange} />
      <CategoryNav categories={categories} activeCategory={activeCategory} onPick={onCategoryPick} />
    </section>
  );
}

export function ProductGrid({ children }: { children: ReactNode }) {
  return <div className="product-catalog-grid">{children}</div>;
}

export function ProductCard({
  product,
  stock,
  soldCount,
  onDetail,
  onBuy
}: {
  product: Product;
  stock: number;
  soldCount: number;
  onDetail: () => void;
  onBuy: () => void;
}) {
  const lowestPrice = product.variants.length ? Math.min(...product.variants.map((variant) => variant.price)) : 0;
  return (
    <article className="catalog-product-card">
      <button className="catalog-product-head" type="button" onClick={onDetail}>
        <span className="product-art" aria-hidden="true">
          {product.imageUrl ? (
            <img
              alt=""
              decoding="async"
              loading="lazy"
              referrerPolicy="no-referrer"
              src={product.imageUrl}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </span>
        <span className={`stock-pill ${stock ? "" : "empty"}`}>{stock ? `${stock} stok` : "Stok habis"}</span>
      </button>
      <div className="catalog-product-body">
        <small>{categoryLabel(product.category)}</small>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
      </div>
      <div className="catalog-product-meta">
        <span>{soldCount} terjual</span>
        <strong>{rupiah.format(lowestPrice)}</strong>
      </div>
      <div className="catalog-product-actions">
        <button className="ghost-btn" type="button" onClick={onDetail}>
          Lihat Detail
        </button>
        <button className="primary-btn" type="button" onClick={onBuy} disabled={!stock}>
          Beli
        </button>
      </div>
    </article>
  );
}

export function ProductPage({
  syncState,
  products,
  query,
  sort,
  categories,
  activeCategory,
  totalVisible,
  totalAll,
  canLoadMore,
  onLoadMore,
  onQueryChange,
  onQueryClear,
  onCategoryPick,
  onSortChange,
  getStock,
  getSoldCount,
  onOpenDetail,
  onBuy
}: {
  syncState: "loading" | "synced" | "fallback";
  products: Product[];
  query: string;
  sort: ProductSortOption;
  categories: SidebarCategoryItem[];
  activeCategory: string;
  totalVisible: number;
  totalAll: number;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onQueryChange: (value: string) => void;
  onQueryClear: () => void;
  onCategoryPick: (value: string) => void;
  onSortChange: (value: ProductSortOption) => void;
  getStock: (product: Product) => number;
  getSoldCount: (productId: string) => number;
  onOpenDetail: (product: Product) => void;
  onBuy: (product: Product) => void;
}) {
  return (
    <section className="market-page">
      <div className="section-head-row">
        <div>
          <p className="eyebrow">Katalog Marketplace</p>
          <h2>Produk</h2>
          <p>Fokus katalog produk digital dengan pencarian, filter kategori, sorting, dan status stok real-time.</p>
        </div>
        <span className="status-badge neutral">{totalVisible}/{totalAll} ditampilkan</span>
      </div>

      <ProductFilters
        query={query}
        sort={sort}
        categories={categories}
        activeCategory={activeCategory}
        onQueryChange={onQueryChange}
        onQueryClear={onQueryClear}
        onCategoryPick={onCategoryPick}
        onSortChange={onSortChange}
      />

      {syncState === "loading" ? (
        <LoadingSkeleton count={9} />
      ) : products.length ? (
        <>
          <ProductGrid>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                stock={getStock(product)}
                soldCount={getSoldCount(product.id)}
                onDetail={() => onOpenDetail(product)}
                onBuy={() => onBuy(product)}
              />
            ))}
          </ProductGrid>
          {canLoadMore ? (
            <div className="load-more-row">
              <button className="secondary-btn" type="button" onClick={onLoadMore}>
                Muat lebih banyak
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState title="Produk tidak ditemukan" description="Ubah kata kunci, kategori, atau urutan untuk menemukan produk." icon="search" />
      )}
    </section>
  );
}

export function HomePage({
  metrics,
  highlights,
  onGoProduct,
  onGoInvoice,
  onGoDeposit
}: {
  metrics: Array<{ label: string; value: string | number }>;
  highlights: Array<{ title: string; caption: string; actionLabel: string; onClick: () => void }>;
  onGoProduct: () => void;
  onGoInvoice: () => void;
  onGoDeposit: () => void;
}) {
  return (
    <section className="market-page home-page">
      <section className="panel home-hero">
        <div>
          <p className="eyebrow">Home</p>
          <h2>Dashboard Marketplace ProByte</h2>
          <p>Akses cepat ke katalog produk, invoice, dan saldo deposit tanpa mencampur semua konten dalam satu halaman.</p>
        </div>
        <div className="quick-actions">
          <button className="primary-btn" type="button" onClick={onGoProduct}>
            <Icon name="box" />
            Buka Produk
          </button>
          <button className="ghost-btn" type="button" onClick={onGoInvoice}>
            <Icon name="invoice" />
            Cek Invoice
          </button>
          <button className="ghost-btn" type="button" onClick={onGoDeposit}>
            <Icon name="wallet" />
            Deposit
          </button>
        </div>
      </section>

      <section className="home-summary-grid">
        {metrics.map((item) => (
          <article className="panel summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="home-highlight-grid">
        {highlights.map((item) => (
          <article className="panel highlight-card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.caption}</p>
            <button className="ghost-btn" type="button" onClick={item.onClick}>
              {item.actionLabel}
            </button>
          </article>
        ))}
      </section>
    </section>
  );
}

export function RankingList({ rows }: { rows: RankingEntry[] }) {
  return (
    <div className="ranking-list">
      {rows.map((row) => (
        <article className={`ranking-item rank-${row.rank <= 3 ? row.rank : "other"}`} key={`${row.rank}-${row.name}`}>
          <div className="ranking-leading">
            <span className="rank-number">#{row.rank}</span>
            <div>
              <strong>{row.name}</strong>
              <small>{row.badge}</small>
            </div>
          </div>
          <div className="ranking-meta">
            <span>{row.transactionCount} transaksi</span>
            <span>{row.points} poin</span>
            <strong>{rupiah.format(row.totalAmount)}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

export function RankingPage({ rows }: { rows: RankingEntry[] }) {
  return (
    <section className="market-page">
      <div className="section-head-row">
        <div>
          <p className="eyebrow">Peringkat</p>
          <h2>Leaderboard Pembeli</h2>
          <p>Peringkat dihitung dari total transaksi selesai dan poin loyalitas.</p>
        </div>
      </div>
      {rows.length ? <RankingList rows={rows} /> : <EmptyState title="Belum ada data peringkat" description="Data akan muncul setelah transaksi berjalan." icon="star" />}
    </section>
  );
}

export function BalanceCard({
  balance,
  settledTopup,
  settledRefund,
  spent,
  pendingTopup
}: {
  balance: number;
  settledTopup: number;
  settledRefund: number;
  spent: number;
  pendingTopup: number;
}) {
  return (
    <article className="panel balance-card">
      <p className="eyebrow">Saldo Aktif</p>
      <h2>{rupiah.format(balance)}</h2>
      <div className="balance-metrics">
        <div>
          <span>Top up</span>
          <strong>{rupiah.format(settledTopup)}</strong>
        </div>
        <div>
          <span>Refund</span>
          <strong>{rupiah.format(settledRefund)}</strong>
        </div>
        <div>
          <span>Dipakai</span>
          <strong>{rupiah.format(spent)}</strong>
        </div>
        <div>
          <span>Pending</span>
          <strong>{rupiah.format(pendingTopup)}</strong>
        </div>
      </div>
    </article>
  );
}

export function DepositHistory({ ledger }: { ledger: WalletLedgerEntry[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Riwayat Deposit</p>
          <h2>Status top up dan saldo</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Status</th>
              <th>Nominal</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length ? (
              ledger.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.createdAt)}</td>
                  <td>{entry.kind.replaceAll("_", " ")}</td>
                  <td>
                    <InvoiceStatusBadge status={entry.status} />
                  </td>
                  <td>{rupiah.format(entry.amount)}</td>
                  <td>{entry.note || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-cell">
                  Belum ada riwayat deposit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DepositPage({
  session,
  balance,
  topUpAmount,
  ledger,
  onTopUpAmountChange,
  onTopUp
}: {
  session: Session | null;
  balance: number;
  topUpAmount: number;
  ledger: WalletLedgerEntry[];
  onTopUpAmountChange: (value: number) => void;
  onTopUp: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!session) {
    return (
      <section className="market-page">
        <EmptyState title="Login dulu untuk deposit" description="Masuk akun pelanggan untuk top up saldo dan melihat riwayat wallet." icon="wallet" />
      </section>
    );
  }

  const settledTopup = ledger.filter((entry) => entry.kind === "TOPUP" && entry.status === "SETTLED").reduce((sum, entry) => sum + entry.amount, 0);
  const settledRefund = ledger.filter((entry) => entry.kind === "REFUND" && entry.status === "SETTLED").reduce((sum, entry) => sum + entry.amount, 0);
  const spent = ledger.filter((entry) => entry.kind === "PAYMENT" && entry.status === "SETTLED").reduce((sum, entry) => sum + entry.amount, 0);
  const pendingTopup = ledger.filter((entry) => entry.kind === "TOPUP" && entry.status === "PENDING").reduce((sum, entry) => sum + entry.amount, 0);
  const presets = [50000, 100000, 200000, 500000];

  return (
    <section className="market-page">
      <div className="section-head-row">
        <div>
          <p className="eyebrow">Deposit</p>
          <h2>Wallet / E-Balance</h2>
          <p>Saldo deposit bisa dipakai untuk checkout instan dan menerima refund garansi.</p>
        </div>
      </div>

      <BalanceCard balance={balance} settledTopup={settledTopup} settledRefund={settledRefund} spent={spent} pendingTopup={pendingTopup} />

      <section className="panel deposit-form-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Top up deposit</p>
            <h2>Tambah saldo sekarang</h2>
          </div>
          <span className="status-badge neutral">Min {rupiah.format(MIN_TOP_UP)}</span>
        </div>
        <form className="deposit-form" onSubmit={onTopUp}>
          <label className="field">
            <span>Nominal deposit</span>
            <input min={MIN_TOP_UP} step={1000} type="number" value={topUpAmount} onChange={(event) => onTopUpAmountChange(Number(event.target.value))} />
          </label>
          <div className="table-actions">
            {presets.map((amount) => (
              <button className="small-btn" key={amount} type="button" onClick={() => onTopUpAmountChange(amount)}>
                {rupiah.format(amount)}
              </button>
            ))}
          </div>
          <button className="primary-btn" type="submit">
            Deposit Sekarang
          </button>
        </form>
      </section>

      <DepositHistory ledger={ledger} />
    </section>
  );
}

export function TransactionHistory({
  orders,
  onOpenInvoice,
  onCopyInvoice
}: {
  orders: Order[];
  onOpenInvoice: (invoice: string) => void;
  onCopyInvoice: (invoice: string) => void;
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Riwayat</p>
          <h2>Transaksi terbaru</h2>
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
                    <small className="muted">{order.variantName}</small>
                  </td>
                  <td>{rupiah.format(order.total)}</td>
                  <td>
                    <InvoiceStatusBadge status={order.paymentStatus} />
                    <br />
                    <InvoiceStatusBadge status={order.deliveryStatus} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="small-btn" type="button" onClick={() => onOpenInvoice(order.invoiceNumber)}>
                        Cek Status
                      </button>
                      <button className="small-btn" type="button" onClick={() => onCopyInvoice(order.invoiceNumber)}>
                        Copy ID
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-cell">
                  Belum ada transaksi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function InvoicePage({
  selectedInvoice,
  selectedInvoiceToken,
  invoiceOrder,
  orders,
  onInvoiceChange,
  onTokenChange,
  onSubmitSearch,
  onPay,
  onCopy,
  onOpenProfile,
  onRefresh,
  onCopyLink,
  onSendReceipt,
  onWhatsAppSupport,
  onOpenInvoice,
  onCopyInvoice
}: {
  selectedInvoice: string;
  selectedInvoiceToken: string;
  invoiceOrder: Order | null;
  orders: Order[];
  onInvoiceChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onSubmitSearch: (event: FormEvent<HTMLFormElement>) => void;
  onPay: (invoice: string) => void;
  onCopy: (value: string) => void;
  onOpenProfile: () => void;
  onRefresh: (invoice: string) => void;
  onCopyLink: (invoice: string) => void;
  onSendReceipt: (invoice: string) => void;
  onWhatsAppSupport: (order: Order) => void;
  onOpenInvoice: (invoice: string) => void;
  onCopyInvoice: (invoice: string) => void;
}) {
  return (
    <section className="market-page invoice-page">
      <section className="panel invoice-top-card">
        <div>
          <p className="eyebrow">Riwayat / Invoice</p>
          <h2>Cek Status Pembayaran</h2>
          <p>Masukkan invoice ID dan token, lalu cek status pembayaran, detail pesanan, dan credential akun.</p>
        </div>
        <form className="invoice-form compact" onSubmit={onSubmitSearch}>
          <label className="field">
            <span>No. Invoice</span>
            <input value={selectedInvoice} onChange={(event) => onInvoiceChange(event.target.value)} placeholder="PBY-20260512-8F3K2A" />
          </label>
          <label className="field">
            <span>Token</span>
            <input value={selectedInvoiceToken} onChange={(event) => onTokenChange(event.target.value)} placeholder="Token invoice" />
          </label>
          <button className="primary-btn" type="submit">
            Cari
          </button>
        </form>
      </section>

      <article className="receipt-invoice">
        <InvoiceResult
          order={invoiceOrder}
          invoice={selectedInvoice}
          onPay={onPay}
          onCopy={onCopy}
          onOpenProfile={onOpenProfile}
          onRefresh={onRefresh}
          onCopyLink={onCopyLink}
          onSendReceipt={onSendReceipt}
          onWhatsAppSupport={onWhatsAppSupport}
        />
      </article>

      <TransactionHistory orders={orders} onOpenInvoice={onOpenInvoice} onCopyInvoice={onCopyInvoice} />
    </section>
  );
}

export function ProfilePage({
  session,
  walletBalance,
  orderCount,
  reviewCount,
  onOpenInvoice,
  onOpenDeposit,
  onOpenRanking,
  children
}: {
  session: Session | null;
  walletBalance: number;
  orderCount: number;
  reviewCount: number;
  onOpenInvoice: () => void;
  onOpenDeposit: () => void;
  onOpenRanking: () => void;
  children: ReactNode;
}) {
  return (
    <section className="market-page profile-page">
      {session ? (
        <section className="panel profile-shortcut-panel">
          <div>
            <p className="eyebrow">Akun / Profil</p>
            <h2>{getDisplayName(session)}</h2>
            <p>Kelola data akun, ringkasan transaksi, dan akses cepat ke invoice, deposit, serta peringkat.</p>
          </div>
          <div className="profile-shortcuts">
            <article>
              <span>Saldo</span>
              <strong>{rupiah.format(walletBalance)}</strong>
            </article>
            <article>
              <span>Transaksi</span>
              <strong>{orderCount}</strong>
            </article>
            <article>
              <span>Ulasan</span>
              <strong>{reviewCount}</strong>
            </article>
          </div>
          <div className="table-actions">
            <button className="small-btn" type="button" onClick={onOpenInvoice}>
              Invoice
            </button>
            <button className="small-btn" type="button" onClick={onOpenDeposit}>
              Deposit
            </button>
            <button className="small-btn" type="button" onClick={onOpenRanking}>
              Peringkat
            </button>
          </div>
        </section>
      ) : null}
      {children}
    </section>
  );
}

export function VoucherPage({
  promos,
  onOpenProduct
}: {
  promos: PromoCode[];
  onOpenProduct: () => void;
}) {
  return (
    <section className="market-page">
      <div className="section-head-row">
        <div>
          <p className="eyebrow">Voucher</p>
          <h2>Kode Promo Aktif</h2>
          <p>Gunakan kode voucher saat checkout pada halaman produk.</p>
        </div>
      </div>
      <div className="voucher-grid">
        {promos.filter((promo) => promo.active).length ? (
          promos
            .filter((promo) => promo.active)
            .map((promo) => (
              <article className="panel voucher-card" key={promo.code}>
                <strong>{promo.code}</strong>
                <p>{promo.label}</p>
                <small>
                  Min transaksi {rupiah.format(promo.minSubtotal)}
                  {promo.maxDiscount ? ` · Maks diskon ${rupiah.format(promo.maxDiscount)}` : ""}
                </small>
              </article>
            ))
        ) : (
          <EmptyState title="Belum ada voucher aktif" description="Voucher baru akan muncul setelah diaktifkan oleh admin." icon="tag" />
        )}
      </div>
      <button className="primary-btn" type="button" onClick={onOpenProduct}>
        <Icon name="box" />
        Belanja Produk
      </button>
    </section>
  );
}

export function ContactPage({
  supportWhatsapp,
  supportEmail,
  onOpenInvoice
}: {
  supportWhatsapp: string;
  supportEmail: string;
  onOpenInvoice: () => void;
}) {
  return (
    <section className="market-page">
      <div className="section-head-row">
        <div>
          <p className="eyebrow">Contact / Bantuan</p>
          <h2>Pusat Bantuan ProByte</h2>
          <p>Hubungi support jika ada masalah pembayaran, pengiriman akun, atau klaim garansi.</p>
        </div>
      </div>
      <div className="contact-grid">
        <article className="panel">
          <h3>WhatsApp Support</h3>
          <p>{supportWhatsapp || "Nomor belum diset"}</p>
        </article>
        <article className="panel">
          <h3>Email Support</h3>
          <p>{supportEmail}</p>
        </article>
        <article className="panel">
          <h3>Cek status transaksi</h3>
          <p>Gunakan invoice ID + token untuk melihat status pembayaran dan delivery.</p>
          <button className="ghost-btn" type="button" onClick={onOpenInvoice}>
            Buka Halaman Invoice
          </button>
        </article>
      </div>
    </section>
  );
}

function getDisplayName(session: Session) {
  const metadataName = session.user.user_metadata?.full_name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName;
  return session.user.email?.split("@")[0] ?? "Pelanggan";
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    AI: "AI Tools",
    Editing: "Design",
    Learning: "Education",
    Music: "Music",
    Productivity: "Productivity",
    Streaming: "Streaming",
    Utility: "Utility",
    "Video Platform": "Video"
  };
  return labels[category] ?? category;
}
