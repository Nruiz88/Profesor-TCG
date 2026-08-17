-- ============================================================
-- 013: Contador global de uso de integraciones (cuota PokeWallet)
-- PokeWallet gratis: 100 pedidos/hora. Este contador por hora UTC
-- (escrito por service role) refuerza el guard de presupuesto en
-- memoria, persistiendo entre reinicios/instancias.
-- Sin policies de RLS: solo el service role accede.
-- ============================================================

create table if not exists public.integration_usage (
  integration text not null,
  bucket text not null,              -- hora UTC: 'YYYY-MM-DDTHH'
  count integer not null default 0,
  primary key (integration, bucket)
);

alter table public.integration_usage enable row level security;

-- Sin policies: el cliente no puede leer ni escribir.
-- Solo el service role (server) mantiene el contador.
