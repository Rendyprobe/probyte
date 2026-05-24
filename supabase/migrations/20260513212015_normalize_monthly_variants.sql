update public.product_variants
set
  name = case id
    when 'netflix-7d' then 'Sharing 1 Bulan'
    when 'netflix-30d' then 'Private 1 Bulan'
    when 'spotify-30d' then 'Individual 1 Bulan'
    when 'spotify-90d' then 'Family 1 Bulan'
    when 'canva-30d' then 'Pro 1 Bulan'
    when 'canva-365d' then 'Pro Team 1 Bulan'
    when 'bstation-30d' then 'Premium 1 Bulan'
    when 'bstation-90d' then 'Premium Plus 1 Bulan'
    when 'grok-7d' then 'Premium Sharing 1 Bulan'
    when 'grok-30d' then 'Premium 1 Bulan'
    when 'viu-30d' then 'Premium 1 Bulan'
    when 'viu-90d' then 'Premium Plus 1 Bulan'
    when 'capcut-30d' then 'Pro 1 Bulan'
    when 'capcut-365d' then 'Pro Team 1 Bulan'
    when 'duolingo-30d' then 'Super 1 Bulan'
    when 'duolingo-180d' then 'Super Family 1 Bulan'
    when 'youtube-30d' then 'Premium 1 Bulan'
    when 'youtube-90d' then 'Family 1 Bulan'
    when 'vidio-30d' then 'Platinum 1 Bulan'
    when 'vidio-365d' then 'Platinum Plus 1 Bulan'
    when 'scribd-30d' then 'Premium 1 Bulan'
    when 'scribd-90d' then 'Premium Plus 1 Bulan'
    when 'iqiyi-30d' then 'VIP 1 Bulan'
    when 'iqiyi-90d' then 'VIP Plus 1 Bulan'
    when 'getcontact-30d' then 'Premium 1 Bulan'
    when 'getcontact-365d' then 'Premium Plus 1 Bulan'
    else name
  end,
  duration_days = 30,
  updated_at = now()
where id in (
  'netflix-7d',
  'netflix-30d',
  'spotify-30d',
  'spotify-90d',
  'canva-30d',
  'canva-365d',
  'bstation-30d',
  'bstation-90d',
  'grok-7d',
  'grok-30d',
  'viu-30d',
  'viu-90d',
  'capcut-30d',
  'capcut-365d',
  'duolingo-30d',
  'duolingo-180d',
  'youtube-30d',
  'youtube-90d',
  'vidio-30d',
  'vidio-365d',
  'scribd-30d',
  'scribd-90d',
  'iqiyi-30d',
  'iqiyi-90d',
  'getcontact-30d',
  'getcontact-365d'
);
