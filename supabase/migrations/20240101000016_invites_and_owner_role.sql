-- Migration 0016: Sistema de convites com roles owner/member
--
-- O modelo de roles 2-níveis evolui:
--   - admin   →  owner   (único, criado no primeiro signup)
--   - operator → member   (entra via convite válido por 7 dias, owner-issued)
--
-- Self-signup fica fechado: somente o primeiro usuário do sistema pode se
-- registrar livremente (vira owner). Subsequentes só conseguem signup se
-- enviarem um invite_token válido em raw_user_meta_data — caso contrário, o
-- trigger handle_new_user lança EXCEPTION e o auth.users INSERT é abortado.
--
-- Backward compat: a CHECK constraint mantém 'admin'/'operator' como valores
-- válidos para evitar quebrar deployments em transição. is_admin() retorna
-- true tanto para 'admin' (legado) quanto para 'owner' (novo).

-- ─── 1. Atualizar CHECK constraint de user_profiles.role ────────────────────
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'operator', 'owner', 'member'));

-- ─── 2. Migrar usuários existentes: admin → owner, operator → member ─────────
UPDATE public.user_profiles SET role = 'owner'  WHERE role = 'admin';
UPDATE public.user_profiles SET role = 'member' WHERE role = 'operator';

-- Default da coluna passa a ser 'member' (em vez de 'operator')
ALTER TABLE public.user_profiles
  ALTER COLUMN role SET DEFAULT 'member';

-- ─── 3. Tabela de convites ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  token       text NOT NULL UNIQUE,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('member')),
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at     timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invites_token_pending_idx
  ON public.invites(token)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS invites_email_idx ON public.invites(email);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Owner tem acesso total. Demais não enxergam nada — convites validam-se
-- via trigger (server-side) usando service_role na Auth Admin API.
DROP POLICY IF EXISTS "invites: owner all" ON public.invites;
CREATE POLICY "invites: owner all"
  ON public.invites FOR ALL
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- ─── 4. Helper is_owner() (paralelo a is_admin) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'owner') FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_owner() FROM public;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

-- Estender is_admin() para reconhecer 'owner' como equivalente a 'admin'.
-- Mantém compatibilidade com policies RESTRICTIVE e helpers TS existentes.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'owner') FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ─── 5. RPC pública: status do primeiro signup ───────────────────────────────
-- Frontend usa para decidir se mostra signup aberto (0 users) ou redireciona
-- para /convite. SECURITY DEFINER lê user_profiles ignorando RLS.
CREATE OR REPLACE FUNCTION public.signup_open()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_profiles);
$$;

REVOKE ALL ON FUNCTION public.signup_open() FROM public;
GRANT EXECUTE ON FUNCTION public.signup_open() TO anon, authenticated;

-- ─── 6. RPC pública: validar token de convite ────────────────────────────────
-- Recebe um token e retorna o email associado se o convite for válido
-- (não usado, não revogado, não expirado). Usado pela tela /convite para
-- pré-popular o email antes do signup.
CREATE OR REPLACE FUNCTION public.invite_lookup(p_token text)
RETURNS TABLE(email text, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email, expires_at
  FROM public.invites
  WHERE token = p_token
    AND used_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.invite_lookup(text) FROM public;
GRANT EXECUTE ON FUNCTION public.invite_lookup(text) TO anon, authenticated;

-- ─── 7. Substituir handle_new_user com lógica de convite ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_count   integer;
  v_invite_token text;
  v_invite       public.invites%ROWTYPE;
  v_role         text;
BEGIN
  SELECT count(*) INTO v_user_count FROM public.user_profiles;

  -- Caso 1: primeira pessoa do sistema vira owner (sem precisar de convite)
  IF v_user_count = 0 THEN
    INSERT INTO public.user_profiles (id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (id) DO UPDATE SET role = 'owner';
    RETURN NEW;
  END IF;

  -- Caso 2: signup só é permitido com token de convite válido
  v_invite_token := NEW.raw_user_meta_data ->> 'invite_token';

  IF v_invite_token IS NULL OR v_invite_token = '' THEN
    RAISE EXCEPTION 'Self-signup desabilitado. Solicite um convite ao owner desta instância.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invite
  FROM public.invites
  WHERE token = v_invite_token
    AND used_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
    AND lower(email) = lower(NEW.email);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido, expirado, já utilizado ou email não corresponde.'
      USING ERRCODE = '42501';
  END IF;

  v_role := v_invite.role;

  UPDATE public.invites
  SET used_at = now()
  WHERE id = v_invite.id;

  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (id) DO UPDATE SET role = v_role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
