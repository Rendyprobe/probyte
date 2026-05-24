import { Icon } from "@/components/common";
import type { PublicReview } from "@/lib/types";

const fallbackTestimonials = [
  {
    name: "Rizky",
    context: "Netflix Premium",
    text: "Checkout cepat, status invoice jelas, dan akun langsung terkirim.",
    rating: "5.0"
  },
  {
    name: "Nabila",
    context: "Canva Pro",
    text: "Stok transparan, jadi bisa beli tanpa chat admin dulu.",
    rating: "4.9"
  },
  {
    name: "Dimas",
    context: "Grok Premium",
    text: "Alur pembayaran rapi, dan invoice tetap bisa dipakai untuk tracking.",
    rating: "4.9"
  },
  {
    name: "Alya",
    context: "Spotify Premium",
    text: "Garansi dan dukungan purna beli terasa jelas dan meyakinkan.",
    rating: "5.0"
  }
];

const faqs = [
  {
    question: "Berapa lama durasi akun?",
    answer: "Semua paket di ProByte mengikuti durasi yang tertulis di varian produk, default 30 hari."
  },
  {
    question: "Apa bisa cek invoice kapan saja?",
    answer: "Bisa. Simpan nomor invoice dan token invoice untuk tracking mandiri."
  },
  {
    question: "Jika akun bermasalah bagaimana?",
    answer: "Ajukan klaim lewat menu profil pelanggan dengan mencantumkan invoice transaksi."
  }
];

type TestimonialCard = {
  name: string;
  context: string;
  text: string;
  rating: string;
};

export function TestimonialsPage({ reviews, onBackToStore }: { reviews: PublicReview[]; onBackToStore: () => void }) {
  const reviewCards = buildReviewCards(reviews);
  const visibleTestimonials = reviewCards.length ? reviewCards : fallbackTestimonials;

  return (
    <section className="testimonials-modern-page">
      <header className="testimonials-banner">
        <div>
          <p className="eyebrow">Testimoni Pelanggan</p>
          <h1>Review Pembeli Produk Digital</h1>
          <p>Transparansi invoice, kualitas stok, dan pengalaman checkout dari pelanggan ProByte.</p>
        </div>
        <button className="primary-btn" type="button" onClick={onBackToStore}>
          <Icon name="box" />
          Kembali Belanja
        </button>
      </header>

      <div className="testimonial-grid modern">
        {visibleTestimonials.map((item) => (
          <article className="testimonial-card modern" key={`${item.name}-${item.context}`}>
            <div className="testimonial-head">
              <span className="avatar">{item.name.slice(0, 1)}</span>
              <div>
                <strong>{item.name}</strong>
                <span>{item.context}</span>
              </div>
              <span className="rating">{item.rating}</span>
            </div>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <section className="faq-modern">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2>Pertanyaan Cepat</h2>
          </div>
        </div>
        <div className="faq-accordion">
          {faqs.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}

function buildReviewCards(reviews: PublicReview[]): TestimonialCard[] {
  return reviews.map((review) => ({
    name: review.displayName,
    context: `${review.productName} ${review.variantName}`,
    text: review.comment,
    rating: review.rating.toFixed(1)
  }));
}
