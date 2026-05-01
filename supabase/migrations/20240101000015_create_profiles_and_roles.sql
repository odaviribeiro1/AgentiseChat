-- Migration 0015: Sistema de roles 2-níveis (admin + operator) para o boilerplate
-- self-hosted. O primeiro usuário registrado torna-se 'admin' automaticamente via
-- trigger; os subsequentes nascem 'operator' e podem ser promovidos manualmente.
--
-- IMPORTANTE: Esta instalação compartilha a base Supabase com outros projetos da
-- Agentise, e já existe uma tabela `public.profiles` (perfis Instagram, sem
-- relação com auth.users). Para evitar colisão, esta migration usa o nome
-- `user_profiles`. Se você fizer fork em uma base limpa, pode renomear de volta
-- para `profiles` se preferir.
--
-- Policies adicionais RESTRICTIVE são aplicadas em accounts/automations/account_tags
-- para bloquear DELETE de não-admins. RESTRICTIVE faz AND com as policies
-- PERMISSIVE existentes — a operação só passa se ambas autorizarem.

-- ─── Tabela user_profiles (1:1 com auth.users) ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê o próprio profile
DROP POLICY IF EXISTS "user_profiles: self select" ON user_profiles;
CREATE POLICY "user_profiles: self select"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Cada usuário pode atualizar o próprio profile (mas o CHECK de role é validado
-- via aplicação — não permitimos auto-promoção via UPDATE direto)
DROP POLICY IF EXISTS "user_profiles: self update" ON user_profiles;
CREATE POLICY "user_profiles: self update"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));

-- Admins podem ver todos os profiles (para gerenciar permissões no futuro)
DROP POLICY IF EXISTS "user_profiles: admin select all" ON user_profiles;
CREATE POLICY "user_profiles: admin select all"
  ON user_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Admins podem atualizar role de qualquer user (promover/rebaixar)
DROP POLICY IF EXISTS "user_profiles: admin update all" ON user_profiles;
CREATE POLICY "user_profiles: admin update all"
  ON user_profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── Função is_admin() ───────────────────────────────────────────────────────
-- SECURITY DEFINER permite ler user_profiles independente de RLS do chamador.
-- Usada nas policies RESTRICTIVE abaixo e nos helpers TypeScript do app.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ─── Trigger first-user-becomes-admin ────────────────────────────────────────
-- Em todo INSERT em auth.users, criamos automaticamente uma row em user_profiles.
-- Se a tabela user_profiles ainda estiver vazia, o novo user vira 'admin'; caso
-- contrário, nasce 'operator'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_profiles) INTO is_first;
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin' ELSE 'operator' END)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── Backfill: usuários já existentes recebem profile ────────────────────────
-- O primeiro user na tabela auth.users (mais antigo) vira admin; os outros
-- viram operator. Idempotente via ON CONFLICT.
INSERT INTO public.user_profiles (id, role)
SELECT
  u.id,
  CASE
    WHEN u.id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
      THEN 'admin'
    ELSE 'operator'
  END
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ─── Policies RESTRICTIVE: DELETE só para admin ──────────────────────────────
-- Estas policies são AS RESTRICTIVE — combinadas via AND com as PERMISSIVE
-- existentes. Resultado: o usuário precisa (a) ser dono do recurso E (b) ser admin.
DROP POLICY IF EXISTS "accounts: delete restricted to admin" ON accounts;
CREATE POLICY "accounts: delete restricted to admin"
  ON accounts AS RESTRICTIVE FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "automations: delete restricted to admin" ON automations;
CREATE POLICY "automations: delete restricted to admin"
  ON automations AS RESTRICTIVE FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "account_tags: delete restricted to admin" ON account_tags;
CREATE POLICY "account_tags: delete restricted to admin"
  ON account_tags AS RESTRICTIVE FOR DELETE
  USING (public.is_admin());
