import type { ViewName } from "@/app/types";

type LegalPageKind = Extract<ViewName, "terms" | "privacy" | "warranty">;

const pages: Record<LegalPageKind, { eyebrow: string; title: string; intro: string; sections: Array<{ title: string; items: string[] }> }> = {
  terms: {
    eyebrow: "Legal",
    title: "Syarat & Ketentuan",
    intro: "Aturan layanan ProByte untuk pembelian produk digital premium.",
    sections: [
      {
        title: "Produk dan penggunaan",
        items: [
          "Produk hanya dijual dari sumber stok yang sah.",
          "Pembeli wajib memakai akun sesuai aturan platform terkait.",
          "Durasi dan tipe paket mengikuti varian yang dibeli."
        ]
      },
      {
        title: "Checkout",
        items: [
          "Pastikan data WhatsApp, email, dan varian sudah benar sebelum membayar.",
          "Harga final dihitung ulang oleh backend saat invoice dibuat.",
          "Invoice yang tidak dibayar dapat otomatis expired."
        ]
      },
      {
        title: "Pengiriman",
        items: [
          "Credential dikirim otomatis setelah pembayaran terverifikasi.",
          "Jika stok habis, order masuk antrian restock atau replacement.",
          "Nomor invoice wajib disimpan untuk tracking atau klaim."
        ]
      }
    ]
  },
  privacy: {
    eyebrow: "Privasi",
    title: "Kebijakan Privasi",
    intro: "Penjelasan data apa yang diproses dan bagaimana ProByte menjaganya.",
    sections: [
      {
        title: "Data yang diproses",
        items: [
          "Email, WhatsApp, invoice, dan status order.",
          "Kredensial stok disimpan terenkripsi.",
          "Aktivitas admin dan webhook dicatat untuk audit."
        ]
      },
      {
        title: "Pemakaian data",
        items: [
          "Data dipakai untuk checkout, invoice, dan garansi.",
          "Email dapat dipakai untuk pengiriman receipt.",
          "Nomor WhatsApp dipakai untuk bantuan transaksi."
        ]
      },
      {
        title: "Keamanan",
        items: [
          "Secret key server tidak boleh masuk frontend.",
          "Invoice guest dilindungi token akses.",
          "Insiden keamanan wajib ditangani dengan rotasi secret."
        ]
      }
    ]
  },
  warranty: {
    eyebrow: "Garansi",
    title: "Garansi & Refund",
    intro: "Panduan klaim jika akun tidak sesuai atau bermasalah.",
    sections: [
      {
        title: "Syarat klaim",
        items: [
          "Klaim hanya untuk invoice yang sudah paid.",
          "Ringkasan masalah harus jelas.",
          "Order guest wajib menyertakan token invoice."
        ]
      },
      {
        title: "Penyelesaian klaim",
        items: [
          "Admin dapat review, replace akun, reject, atau refund ke saldo.",
          "Refund masuk sebagai wallet balance pelanggan.",
          "Semua keputusan tercatat di audit log."
        ]
      },
      {
        title: "Batasan",
        items: [
          "Garansi tidak berlaku untuk penyalahgunaan akun.",
          "Klaim tanpa invoice valid dapat ditolak.",
          "Kebijakan dapat diperbarui sesuai kebutuhan operasional."
        ]
      }
    ]
  }
};

export function LegalPage({ kind, onBackToStore }: { kind: LegalPageKind; onBackToStore: () => void }) {
  const page = pages[kind];

  return (
    <section className="legal-modern-page">
      <header className="legal-modern-head">
        <div>
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
        </div>
        <button className="primary-btn" type="button" onClick={onBackToStore}>
          Kembali ke Store
        </button>
      </header>

      <div className="legal-modern-grid">
        {page.sections.map((section) => (
          <article className="legal-section-card" key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
