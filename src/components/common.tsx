import type { ReactNode } from "react";

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
    <button className={`nav-btn ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
      <Icon name={icon} />
      {label}
    </button>
  );
}

export function MetricRow({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="metric-row">
      {items.map((item) => (
        <div className="metric" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function LogoMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 44 44" role="img">
        <defs>
          <linearGradient id="pbLogo" x1="5" x2="39" y1="8" y2="38">
            <stop offset="0" stopColor="#ff9a4a" />
            <stop offset="0.52" stopColor="#ff7b2f" />
            <stop offset="1" stopColor="#2f80ed" />
          </linearGradient>
        </defs>
        <path
          d="M8 12.5C8 8.9 10.9 6 14.5 6h15C33.1 6 36 8.9 36 12.5v19C36 35.1 33.1 38 29.5 38h-15C10.9 38 8 35.1 8 31.5v-19Z"
          fill="url(#pbLogo)"
        />
        <path
          d="M15 14h8.5c3 0 5.2 1.8 5.2 4.4 0 1.9-1.1 3.2-2.7 3.8 2 .5 3.4 2 3.4 4.2 0 2.8-2.3 4.6-5.5 4.6H15V14Zm4.4 3.5v3.4h3.6c.9 0 1.5-.7 1.5-1.7s-.6-1.7-1.5-1.7h-3.6Zm0 6.8v3.2h4.2c1 0 1.6-.6 1.6-1.6s-.6-1.6-1.6-1.6h-4.2Z"
          fill="#fff"
        />
        <path d="M10 16H5M10 22H5M10 28H5M39 16h-5M39 22h-5M39 28h-5" stroke="#b9dcff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export type IconName = "box" | "invoice" | "shield" | "search" | "card" | "close" | "user";

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
    )
  };

  return (
    <span className="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">{paths[name]}</svg>
    </span>
  );
}
