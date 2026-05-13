import type { Product } from "./types";

export const products: Product[] = [
  {
    id: "netflix",
    name: "Netflix",
    initials: "NF",
    category: "Streaming",
    description: "Akun premium siap pakai untuk streaming film dan series.",
    tags: ["Populer", "Instant"],
    variants: [
      { id: "netflix-7d", name: "Sharing 7 Hari", duration: "7 hari", price: 18000, seed: 4 },
      { id: "netflix-30d", name: "Private 1 Bulan", duration: "30 hari", price: 68000, seed: 3 }
    ]
  },
  {
    id: "spotify",
    name: "Spotify",
    initials: "SP",
    category: "Music",
    description: "Akun premium untuk musik tanpa jeda dan kualitas audio tinggi.",
    tags: ["Music", "Ready"],
    variants: [
      { id: "spotify-30d", name: "Individual 1 Bulan", duration: "30 hari", price: 32000, seed: 6 },
      { id: "spotify-90d", name: "Individual 3 Bulan", duration: "90 hari", price: 85000, seed: 2 }
    ]
  },
  {
    id: "canva",
    name: "Canva",
    initials: "CV",
    category: "Productivity",
    description: "Akun desain premium untuk template, elemen, dan tools kreatif.",
    tags: ["Desain", "Tim"],
    variants: [
      { id: "canva-30d", name: "Pro 1 Bulan", duration: "30 hari", price: 17000, seed: 8 },
      { id: "canva-365d", name: "Pro 1 Tahun", duration: "365 hari", price: 125000, seed: 1 }
    ]
  },
  {
    id: "bstation",
    name: "Bstation",
    initials: "BS",
    category: "Streaming",
    description: "Akun premium untuk konten anime dan hiburan Asia.",
    tags: ["Anime", "Ready"],
    variants: [
      { id: "bstation-30d", name: "Premium 1 Bulan", duration: "30 hari", price: 25000, seed: 3 },
      { id: "bstation-90d", name: "Premium 3 Bulan", duration: "90 hari", price: 65000, seed: 2 }
    ]
  },
  {
    id: "grok",
    name: "Grok",
    initials: "GK",
    category: "AI",
    description: "Akun AI premium untuk produktivitas, riset, dan percakapan cepat.",
    tags: ["AI", "Baru"],
    variants: [
      { id: "grok-7d", name: "Premium 7 Hari", duration: "7 hari", price: 45000, seed: 2 },
      { id: "grok-30d", name: "Premium 1 Bulan", duration: "30 hari", price: 145000, seed: 0 }
    ]
  },
  {
    id: "viu",
    name: "Viu",
    initials: "VU",
    category: "Streaming",
    description: "Akun premium untuk drama, film, dan series Asia.",
    tags: ["Drama", "Hemat"],
    variants: [
      { id: "viu-30d", name: "Premium 1 Bulan", duration: "30 hari", price: 21000, seed: 4 },
      { id: "viu-90d", name: "Premium 3 Bulan", duration: "90 hari", price: 54000, seed: 2 }
    ]
  },
  {
    id: "capcut",
    name: "CapCut",
    initials: "CC",
    category: "Editing",
    description: "Akun premium untuk editing video, template, dan ekspor konten.",
    tags: ["Editor", "Creator"],
    variants: [
      { id: "capcut-30d", name: "Pro 1 Bulan", duration: "30 hari", price: 39000, seed: 4 },
      { id: "capcut-365d", name: "Pro 1 Tahun", duration: "365 hari", price: 245000, seed: 1 }
    ]
  },
  {
    id: "duolingo",
    name: "Duolingo",
    initials: "DL",
    category: "Learning",
    description: "Akun premium untuk belajar bahasa dengan latihan tanpa batas.",
    tags: ["Belajar", "Bahasa"],
    variants: [
      { id: "duolingo-30d", name: "Super 1 Bulan", duration: "30 hari", price: 36000, seed: 3 },
      { id: "duolingo-180d", name: "Super 6 Bulan", duration: "180 hari", price: 155000, seed: 1 }
    ]
  },
  {
    id: "youtube",
    name: "YouTube",
    initials: "YT",
    category: "Video Platform",
    description: "Akun premium untuk video dan musik dengan benefit premium.",
    tags: ["Video", "Music"],
    variants: [
      { id: "youtube-30d", name: "Premium 1 Bulan", duration: "30 hari", price: 39000, seed: 5 },
      { id: "youtube-90d", name: "Premium 3 Bulan", duration: "90 hari", price: 105000, seed: 2 }
    ]
  },
  {
    id: "vidio",
    name: "Vidio",
    initials: "VD",
    category: "Streaming",
    description: "Akun premium untuk hiburan lokal, olahraga, dan series.",
    tags: ["Lokal", "Sport"],
    variants: [
      { id: "vidio-30d", name: "Platinum 1 Bulan", duration: "30 hari", price: 29000, seed: 4 },
      { id: "vidio-365d", name: "Platinum 1 Tahun", duration: "365 hari", price: 215000, seed: 1 }
    ]
  },
  {
    id: "scribd",
    name: "Scribd",
    initials: "SC",
    category: "Productivity",
    description: "Akun premium untuk dokumen, ebook, audiobook, dan referensi.",
    tags: ["Dokumen", "Riset"],
    variants: [
      { id: "scribd-30d", name: "Premium 1 Bulan", duration: "30 hari", price: 27000, seed: 3 },
      { id: "scribd-90d", name: "Premium 3 Bulan", duration: "90 hari", price: 72000, seed: 1 }
    ]
  },
  {
    id: "iqiyi",
    name: "iQIYI",
    initials: "IQ",
    category: "Streaming",
    description: "Akun premium untuk drama Asia, anime, dan film.",
    tags: ["Drama", "Asia"],
    variants: [
      { id: "iqiyi-30d", name: "VIP 1 Bulan", duration: "30 hari", price: 26000, seed: 4 },
      { id: "iqiyi-90d", name: "VIP 3 Bulan", duration: "90 hari", price: 66000, seed: 1 }
    ]
  },
  {
    id: "getcontact",
    name: "GetContact",
    initials: "GC",
    category: "Utility",
    description: "Akun premium untuk identifikasi kontak dan proteksi panggilan.",
    tags: ["Utility", "Privasi"],
    variants: [
      { id: "getcontact-30d", name: "Premium 1 Bulan", duration: "30 hari", price: 22000, seed: 3 },
      { id: "getcontact-365d", name: "Premium 1 Tahun", duration: "365 hari", price: 165000, seed: 0 }
    ]
  }
];

export function getProduct(productId: string) {
  return products.find((product) => product.id === productId);
}

export function getVariant(variantId: string) {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return variant;
  }
  return null;
}
