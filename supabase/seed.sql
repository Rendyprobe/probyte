insert into public.promo_codes (id, code, label, type, value, min_subtotal, max_discount)
values
  ('promo_probyte10', 'PROBYTE10', 'Diskon 10%', 'PERCENT', 10, 25000, 20000),
  ('promo_hemat5k', 'HEMAT5K', 'Potongan Rp5.000', 'FIXED', 5000, 50000, null)
on conflict (code) do update set
  label = excluded.label,
  type = excluded.type,
  value = excluded.value,
  min_subtotal = excluded.min_subtotal,
  max_discount = excluded.max_discount;

insert into public.products (id, slug, name, category, description, icon_label, seo_title, seo_description)
values
  ('netflix', 'netflix', 'Netflix', 'Streaming', 'Akun premium siap pakai untuk streaming film dan series.', 'NF', 'Netflix Premium - ProByte', 'Beli akun Netflix premium dengan stok ready, invoice aman, dan pengiriman otomatis di ProByte.'),
  ('spotify', 'spotify', 'Spotify', 'Music', 'Akun premium untuk musik tanpa jeda dan kualitas audio tinggi.', 'SP', 'Spotify Premium - ProByte', 'Beli akun Spotify premium dengan saldo, voucher, dan invoice aman di ProByte.'),
  ('canva', 'canva', 'Canva', 'Productivity', 'Akun desain premium untuk template, elemen, dan tools kreatif.', 'CV', 'Canva Pro - ProByte', 'Beli akun Canva Pro premium dengan stok ready dan pengiriman otomatis.'),
  ('bstation', 'bstation', 'Bstation', 'Streaming', 'Akun premium untuk konten anime dan hiburan Asia.', 'BS', 'Bstation Premium - ProByte', 'Beli akun Bstation premium untuk anime dan hiburan Asia.'),
  ('grok', 'grok', 'Grok', 'AI', 'Akun AI premium untuk produktivitas, riset, dan percakapan cepat.', 'GK', 'Grok Premium - ProByte', 'Beli akun Grok premium untuk produktivitas dan riset AI.'),
  ('viu', 'viu', 'Viu', 'Streaming', 'Akun premium untuk drama, film, dan series Asia.', 'VU', 'Viu Premium - ProByte', 'Beli akun Viu premium dengan invoice dan garansi saldo.'),
  ('capcut', 'capcut', 'CapCut', 'Editing', 'Akun premium untuk editing video, template, dan ekspor konten.', 'CC', 'CapCut Pro - ProByte', 'Beli akun CapCut Pro untuk editing video dan template premium.'),
  ('duolingo', 'duolingo', 'Duolingo', 'Learning', 'Akun premium untuk belajar bahasa dengan latihan tanpa batas.', 'DL', 'Duolingo Super - ProByte', 'Beli akun Duolingo Super untuk belajar bahasa tanpa batas.'),
  ('youtube', 'youtube', 'YouTube', 'Video Platform', 'Akun premium untuk video dan musik dengan benefit premium.', 'YT', 'YouTube Premium - ProByte', 'Beli akun YouTube Premium dengan pengiriman akun otomatis.'),
  ('vidio', 'vidio', 'Vidio', 'Streaming', 'Akun premium untuk hiburan lokal, olahraga, dan series.', 'VD', 'Vidio Platinum - ProByte', 'Beli akun Vidio premium untuk hiburan lokal dan olahraga.'),
  ('scribd', 'scribd', 'Scribd', 'Productivity', 'Akun premium untuk dokumen, ebook, audiobook, dan referensi.', 'SC', 'Scribd Premium - ProByte', 'Beli akun Scribd premium untuk dokumen, ebook, dan referensi.'),
  ('iqiyi', 'iqiyi', 'iQIYI', 'Streaming', 'Akun premium untuk drama Asia, anime, dan film.', 'IQ', 'iQIYI VIP - ProByte', 'Beli akun iQIYI VIP untuk drama Asia, anime, dan film.'),
  ('getcontact', 'getcontact', 'GetContact', 'Utility', 'Akun premium untuk identifikasi kontak dan proteksi panggilan.', 'GC', 'GetContact Premium - ProByte', 'Beli akun GetContact premium untuk identifikasi kontak dan proteksi panggilan.')
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  icon_label = excluded.icon_label,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  updated_at = now();

insert into public.product_variants (id, product_id, name, duration_days, sell_price, low_stock_threshold)
values
  ('netflix-7d', 'netflix', 'Sharing 7 Hari', 7, 18000, 2),
  ('netflix-30d', 'netflix', 'Private 1 Bulan', 30, 68000, 2),
  ('spotify-30d', 'spotify', 'Individual 1 Bulan', 30, 32000, 2),
  ('spotify-90d', 'spotify', 'Individual 3 Bulan', 90, 85000, 2),
  ('canva-30d', 'canva', 'Pro 1 Bulan', 30, 17000, 2),
  ('canva-365d', 'canva', 'Pro 1 Tahun', 365, 125000, 2),
  ('bstation-30d', 'bstation', 'Premium 1 Bulan', 30, 25000, 2),
  ('bstation-90d', 'bstation', 'Premium 3 Bulan', 90, 65000, 2),
  ('grok-7d', 'grok', 'Premium 7 Hari', 7, 45000, 2),
  ('grok-30d', 'grok', 'Premium 1 Bulan', 30, 145000, 2),
  ('viu-30d', 'viu', 'Premium 1 Bulan', 30, 21000, 2),
  ('viu-90d', 'viu', 'Premium 3 Bulan', 90, 54000, 2),
  ('capcut-30d', 'capcut', 'Pro 1 Bulan', 30, 39000, 2),
  ('capcut-365d', 'capcut', 'Pro 1 Tahun', 365, 245000, 2),
  ('duolingo-30d', 'duolingo', 'Super 1 Bulan', 30, 36000, 2),
  ('duolingo-180d', 'duolingo', 'Super 6 Bulan', 180, 155000, 2),
  ('youtube-30d', 'youtube', 'Premium 1 Bulan', 30, 39000, 2),
  ('youtube-90d', 'youtube', 'Premium 3 Bulan', 90, 105000, 2),
  ('vidio-30d', 'vidio', 'Platinum 1 Bulan', 30, 29000, 2),
  ('vidio-365d', 'vidio', 'Platinum 1 Tahun', 365, 215000, 2),
  ('scribd-30d', 'scribd', 'Premium 1 Bulan', 30, 27000, 2),
  ('scribd-90d', 'scribd', 'Premium 3 Bulan', 90, 72000, 2),
  ('iqiyi-30d', 'iqiyi', 'VIP 1 Bulan', 30, 26000, 2),
  ('iqiyi-90d', 'iqiyi', 'VIP 3 Bulan', 90, 66000, 2),
  ('getcontact-30d', 'getcontact', 'Premium 1 Bulan', 30, 22000, 2),
  ('getcontact-365d', 'getcontact', 'Premium 1 Tahun', 365, 165000, 2)
on conflict (id) do update set
  product_id = excluded.product_id,
  name = excluded.name,
  duration_days = excluded.duration_days,
  sell_price = excluded.sell_price,
  low_stock_threshold = excluded.low_stock_threshold,
  updated_at = now();

-- Create admin passwords server-side with a one-way hash. The Node API supports scrypt hashes.
