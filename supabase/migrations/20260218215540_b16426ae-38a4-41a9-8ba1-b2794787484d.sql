
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'dealer_admin', 'salesman');

-- 2. Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'suspended');

-- 3. Create user status enum
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');

-- 4. Plans table (public read)
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are readable by all authenticated users" ON public.plans FOR SELECT TO authenticated USING (true);

-- 5. Dealers table
CREATE TABLE public.dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;

-- 6. Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id UUID REFERENCES public.dealers(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status public.user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 8. Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status public.subscription_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 9. Helper: check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 10. Helper: get current user's dealer_id
CREATE OR REPLACE FUNCTION public.get_user_dealer_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dealer_id FROM public.profiles WHERE id = _user_id;
$$;

-- 11. Helper: check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin');
$$;

-- 12. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Trigger: update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 14. RLS Policies for dealers
CREATE POLICY "Super admin full access to dealers" ON public.dealers
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Dealer users can view own dealer" ON public.dealers
  FOR SELECT TO authenticated
  USING (id = public.get_user_dealer_id(auth.uid()));

-- 15. RLS Policies for profiles
CREATE POLICY "Super admin full access to profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Dealer admins can view dealer profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    dealer_id = public.get_user_dealer_id(auth.uid())
    AND public.has_role(auth.uid(), 'dealer_admin')
  );

CREATE POLICY "Dealer admins can manage dealer profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    dealer_id = public.get_user_dealer_id(auth.uid())
    AND public.has_role(auth.uid(), 'dealer_admin')
  )
  WITH CHECK (
    dealer_id = public.get_user_dealer_id(auth.uid())
    AND public.has_role(auth.uid(), 'dealer_admin')
  );

-- 16. RLS Policies for user_roles
CREATE POLICY "Super admin full access to user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 17. RLS Policies for subscriptions
CREATE POLICY "Super admin full access to subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Dealer users can view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (dealer_id = public.get_user_dealer_id(auth.uid()));

CREATE POLICY "Dealer admins can manage own subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (
    dealer_id = public.get_user_dealer_id(auth.uid())
    AND public.has_role(auth.uid(), 'dealer_admin')
  )
  WITH CHECK (
    dealer_id = public.get_user_dealer_id(auth.uid())
    AND public.has_role(auth.uid(), 'dealer_admin')
  );
