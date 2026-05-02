create table if not exists accounts (
  id bigint primary key,
  name text not null,
  phone text not null,
  pin text not null,
  role text not null check (role in ('kasir', 'admin', 'pelanggan')),
  shift text not null default 'Belum mulai',
  outlet text not null default 'YM-W HAIRCUT Cabang Utama',
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id bigint primary key,
  name text not null,
  service text not null,
  total integer not null default 0,
  method text not null default 'Tunai',
  cashier text not null,
  time text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists cashier_bookings (
  id bigint primary key,
  date date not null,
  time text not null,
  name text not null,
  phone text not null,
  service text not null,
  barber text not null,
  status text not null default 'Dikonfirmasi',
  tone text not null default 'success',
  created_at timestamptz not null default now()
);

insert into accounts (id, name, phone, pin, role, shift, outlet)
values
  (1, 'Sari Wulandari', '081234567890', '1234', 'kasir', 'Pagi', 'YM-W HAIRCUT Cabang Utama'),
  (2, 'Budi Santoso', '081298765432', '1111', 'admin', 'Owner', 'YM-W HAIRCUT Cabang Utama')
on conflict (id) do nothing;
