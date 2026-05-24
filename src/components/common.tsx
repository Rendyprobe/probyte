import type {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TableHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

type InputProps = DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
type SelectProps = DetailedHTMLProps<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;
type TextareaProps = DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;
type TableProps = DetailedHTMLProps<TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>;

type Tone = "neutral" | "success" | "warning" | "danger" | "primary";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

export type IconName =
  | "box"
  | "invoice"
  | "shield"
  | "search"
  | "card"
  | "close"
  | "user"
  | "star"
  | "bolt"
  | "check"
  | "clock"
  | "copy"
  | "grid"
  | "lock"
  | "refresh"
  | "spark"
  | "tag"
  | "wallet"
  | "menu"
  | "chevron-right"
  | "help"
  | "support";

export type NavItem = {
  id: string;
  label: string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
};

export function AppShell({
  sidebar,
  mobileNav,
  children,
  footer,
  toasts
}: {
  sidebar?: ReactNode;
  mobileNav?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  toasts?: ReactNode;
}) {
  return (
    <div className={`app-shell ${sidebar ? "" : "no-sidebar"}`.trim()}>
      {sidebar ? <aside className="app-sidebar-column">{sidebar}</aside> : null}
      <main className="app-main-column">
        <div className="app-main-scroll">{children}</div>
        {footer ? <div className="app-footer">{footer}</div> : null}
      </main>
      {mobileNav}
      {toasts}
    </div>
  );
}

export function Sidebar({
  menuItems,
  categoryItems,
  onCategoryPick,
  onInvoice,
  activeCategory
}: {
  menuItems: NavItem[];
  categoryItems: Array<{ key: string; label: string; icon: IconName }>;
  onCategoryPick: (value: string) => void;
  onInvoice: () => void;
  activeCategory: string;
}) {
  return (
    <div className="store-sidebar">
      <button className="store-logo" type="button" onClick={menuItems[0]?.onClick}>
        <LogoMark />
        <span>
          <strong>ProByte</strong>
          <small>Digital Product App Store</small>
        </span>
      </button>

      <nav className="side-nav" aria-label="Menu utama">
        {menuItems.map((item) => (
          <button className={`side-nav-item ${item.active ? "is-active" : ""}`} key={item.id} type="button" onClick={item.onClick}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <section className="side-categories" aria-label="Kategori">
        <h3>Kategori</h3>
        <div>
          {categoryItems.map((item) => (
            <button
              className={`side-category-chip ${activeCategory === item.key ? "is-active" : ""}`}
              key={item.key}
              type="button"
              onClick={() => onCategoryPick(item.key)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="support-mini">
        <strong>Butuh bantuan checkout?</strong>
        <p>Gunakan menu invoice untuk cek status transaksi kapan pun.</p>
        <button className="secondary-btn" type="button" onClick={onInvoice}>
          <Icon name="invoice" />
          Cek Invoice
        </button>
      </div>
    </div>
  );
}

export function MobileBottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi bawah">
      {items.map((item) => (
        <button className={`mobile-bottom-item ${item.active ? "is-active" : ""}`} key={item.id} type="button" onClick={item.onClick}>
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function CommandSearch({
  query,
  onQueryChange,
  onClear,
  placeholder = "Cari produk digital..."
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}) {
  return (
    <label className="command-search" aria-label="Cari produk">
      <Icon name="search" />
      <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} type="search" />
      {query ? (
        <button className="command-clear" type="button" onClick={onClear}>
          <Icon name="close" />
        </button>
      ) : null}
    </label>
  );
}

export function BentoCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return <article className={`bento-card ${className}`.trim()}>{children}</article>;
}

export function CategoryCard({
  label,
  icon,
  count,
  active,
  onClick,
  subtitle
}: {
  label: string;
  icon: IconName;
  count: number;
  active?: boolean;
  onClick: () => void;
  subtitle?: string;
}) {
  return (
    <button className={`category-app-card ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
      <span className="category-app-icon">
        <Icon name={icon} />
      </span>
      <span className="category-app-copy">
        <strong>{label}</strong>
        <small>{subtitle ?? `${count} produk`}</small>
      </span>
    </button>
  );
}

export function ProductAppCard({
  title,
  category,
  description,
  price,
  stockLabel,
  icon,
  badge,
  onClick
}: {
  title: string;
  category: string;
  description: string;
  price: string;
  stockLabel: string;
  icon: ReactNode;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="product-app-card" type="button" onClick={onClick}>
      <span className="product-app-visual">{icon}</span>
      <span className="product-app-body">
        <span className="product-app-head">
          <small>{category}</small>
          {badge}
        </span>
        <strong>{title}</strong>
        <p>{description}</p>
      </span>
      <span className="product-app-foot">
        <span>{stockLabel}</span>
        <b>{price}</b>
      </span>
      <span className="product-app-buy">Beli</span>
    </button>
  );
}

export function CheckoutStepper({
  steps,
  activeStep = 0
}: {
  steps: Array<{ title: string; hint?: string }>;
  activeStep?: number;
}) {
  return (
    <ol className="checkout-stepper" aria-label="Checkout progress">
      {steps.map((step, index) => (
        <li className={index <= activeStep ? "is-active" : ""} key={step.title}>
          <span>{index + 1}</span>
          <div>
            <strong>{step.title}</strong>
            {step.hint ? <small>{step.hint}</small> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ReceiptInvoice({ children }: { children: ReactNode }) {
  return <article className="receipt-invoice">{children}</article>;
}

export function DataTable({ children }: { children: ReactNode }) {
  return <div className="data-table-wrap">{children}</div>;
}

export function AdminDashboardShell({
  sidebar,
  children
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="admin-dashboard-shell">
      <aside>{sidebar}</aside>
      <section>{children}</section>
    </div>
  );
}

export function StatBentoCard({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: Tone }) {
  return (
    <article className={`stat-bento tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function Navbar() {
  return null;
}

export function MobileNav() {
  return null;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const variantClass =
    variant === "primary" ? "primary-btn" : variant === "secondary" ? "secondary-btn" : variant === "danger" ? "danger-btn" : "ghost-btn";
  const sizeClass = size === "sm" ? "small-btn" : "";
  return (
    <button className={`btn ${variantClass} ${sizeClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`panel ${className}`.trim()}>{children}</section>;
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export function Input({ className = "", ...props }: InputProps) {
  return <input className={`field-control ${className}`.trim()} {...props} />;
}

export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <select className={`field-control ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...props }: TextareaProps) {
  return <textarea className={`field-control ${className}`.trim()} {...props} />;
}

export function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-head">
          <strong>{title}</strong>
          <button className="ghost-btn icon-btn" type="button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Table({ className = "", children, ...props }: TableProps) {
  return (
    <div className="data-table-wrap">
      <table className={className} {...props}>
        {children}
      </table>
    </div>
  );
}

export function ProductGrid({ children }: { children: ReactNode }) {
  return <div className="product-list-grid">{children}</div>;
}

export function ProductCard({
  title,
  category,
  description,
  price,
  stockLabel,
  icon,
  badge,
  onClick
}: {
  title: string;
  category: string;
  description: string;
  price: string;
  stockLabel: string;
  icon: ReactNode;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <ProductAppCard
      title={title}
      category={category}
      description={description}
      price={price}
      stockLabel={stockLabel}
      icon={icon}
      badge={badge}
      onClick={onClick}
    />
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const successValues = ["PAID", "DELIVERED", "SETTLED", "Aktif", "REFUNDED_TO_BALANCE", "SUCCESS"];
  const warningValues = ["WAITING_PAYMENT", "PENDING", "PROCESSING", "OPEN", "IN_REVIEW", "Sandbox"];
  const tone = successValues.includes(status) ? "success" : warningValues.includes(status) ? "warning" : "danger";
  return <span className={`status-badge ${tone}`}>{status.replaceAll("_", " ")}</span>;
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return <StatBentoCard label={label} value={value} />;
}

export function AdminSidebar({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange
}: {
  title: string;
  subtitle: string;
  tabs: Array<{ id: string; label: string; icon: IconName }>;
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <LogoMark />
        <div>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </div>
      </div>
      <nav className="admin-sidebar-nav" aria-label="Admin tabs">
        {tabs.map((tab) => (
          <button className={`admin-side-link ${activeTab === tab.id ? "is-active" : ""}`} key={tab.id} type="button" onClick={() => onTabChange(tab.id)}>
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="admin-sidebar-note">
        <span className="status-badge success">Realtime</span>
        <p>Semua data order, stok, promo, dan klaim terhubung ke backend.</p>
      </div>
    </div>
  );
}

export function NavButton({
  active,
  label,
  icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <button className={`side-nav-item ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

export function MetricRow({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="metric-row">
      {items.map((item) => (
        <StatBentoCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="section-desc">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon = "search"
}: {
  title: string;
  description?: string;
  icon?: IconName;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} />
      </span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function LoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <span />
          <b />
          <i />
        </div>
      ))}
    </div>
  );
}

export function LogoMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <defs>
          <linearGradient id="pbLogo" x1="8" x2="40" y1="8" y2="40">
            <stop offset="0" stopColor="#EA580C" />
            <stop offset="0.55" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="36" height="36" rx="12" fill="url(#pbLogo)" />
        <path
          d="M16 14h10.2c3.8 0 6.6 2.2 6.6 5.3 0 1.9-.9 3.2-2.7 4 2.2.8 3.6 2.4 3.6 4.9 0 3.5-2.8 5.8-7 5.8H16V14Zm4.8 3.8v3.8h4.8c1.4 0 2.3-.8 2.3-1.9 0-1.2-.9-1.9-2.3-1.9h-4.8Zm0 7.4V30h5.4c1.6 0 2.6-.9 2.6-2.3 0-1.4-1-2.3-2.6-2.3h-5.4Z"
          fill="#fff"
        />
      </svg>
    </span>
  );
}

export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    box: (
      <>
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
        <path d="m4 7.5 8 4.5 8-4.5" />
        <path d="M12 12v9" />
      </>
    ),
    invoice: (
      <>
        <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-3Z" />
        <path d="M9 12l2 2 4-5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    card: (
      <>
        <path d="M4 7h16v10H4z" />
        <path d="M4 10h16" />
        <path d="M8 15h3" />
      </>
    ),
    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    star: (
      <>
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
      </>
    ),
    bolt: (
      <>
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
      </>
    ),
    check: (
      <>
        <path d="M20 6 9 17l-5-5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    copy: (
      <>
        <path d="M8 8h10v12H8z" />
        <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    grid: (
      <>
        <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5" />
        <path d="M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5" />
      </>
    ),
    spark: (
      <>
        <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Z" />
        <path d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14Z" />
      </>
    ),
    tag: (
      <>
        <path d="M20 12 12 20 4 12V4h8l8 8Z" />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7a2 2 0 0 1 2-2h12v14H6a2 2 0 0 1-2-2V7Z" />
        <path d="M16 11h4v4h-4a2 2 0 0 1 0-4Z" />
        <path d="M4 8h14" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    "chevron-right": (
      <>
        <path d="m9 6 6 6-6 6" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 4 2c-.8.5-1.5 1.1-1.5 2.5" />
        <circle cx="12" cy="17" r="1" />
      </>
    ),
    support: (
      <>
        <path d="M4 12a8 8 0 0 1 16 0" />
        <path d="M4 12v5h4v-5M16 12v5h4v-5" />
        <path d="M8 20h8" />
      </>
    )
  };

  return (
    <span className="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">{paths[name]}</svg>
    </span>
  );
}
