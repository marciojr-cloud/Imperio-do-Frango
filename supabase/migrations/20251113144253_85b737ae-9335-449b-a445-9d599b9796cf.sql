-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create naturezas (categories) table
CREATE TABLE public.naturezas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.naturezas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own naturezas"
  ON public.naturezas FOR ALL
  USING (auth.uid() = user_id);

-- Create formas_pagamento (payment methods) table
CREATE TABLE public.formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment methods"
  ON public.formas_pagamento FOR ALL
  USING (auth.uid() = user_id);

-- Create lancamentos (transactions) table
CREATE TABLE public.lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_pagamento DATE,
  natureza_id UUID NOT NULL REFERENCES public.naturezas(id) ON DELETE RESTRICT,
  forma_pagamento_id UUID NOT NULL REFERENCES public.formas_pagamento(id) ON DELETE RESTRICT,
  pago BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lancamentos"
  ON public.lancamentos FOR ALL
  USING (auth.uid() = user_id);

-- Create controle_caixa (cash control) table
CREATE TABLE public.controle_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  saldo_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
  entradas DECIMAL(10,2) NOT NULL DEFAULT 0,
  saidas DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo_final DECIMAL(10,2) NOT NULL DEFAULT 0,
  trocos DECIMAL(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.controle_caixa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own caixa"
  ON public.controle_caixa FOR ALL
  USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lancamentos_updated_at
  BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_caixa_updated_at
  BEFORE UPDATE ON public.controle_caixa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default naturezas for new users
CREATE OR REPLACE FUNCTION public.create_default_naturezas()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.naturezas (user_id, nome, descricao) VALUES
    (NEW.id, 'Fornecedor', 'Pagamentos a fornecedores'),
    (NEW.id, 'Frota', 'Despesas com veículos e combustível'),
    (NEW.id, 'Despesa da Loja', 'Despesas gerais da loja');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_user_default_naturezas
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_naturezas();

-- Insert default payment methods for new users
CREATE OR REPLACE FUNCTION public.create_default_payment_methods()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.formas_pagamento (user_id, nome, descricao) VALUES
    (NEW.id, 'Dinheiro', 'Pagamento em dinheiro'),
    (NEW.id, 'PIX', 'Pagamento via PIX'),
    (NEW.id, 'Cartão de Débito', 'Pagamento com cartão de débito'),
    (NEW.id, 'Cartão de Crédito', 'Pagamento com cartão de crédito');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_user_default_payment_methods
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_payment_methods();