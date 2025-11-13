import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Layout from "@/components/Layout";

interface Stats {
  totalGastos: number;
  gastosMes: number;
  gastosAbertos: number;
  saldoCaixa: number;
}

interface GastosPorNatureza {
  nome: string;
  total: number;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalGastos: 0,
    gastosMes: 0,
    gastosAbertos: 0,
    saldoCaixa: 0,
  });
  const [gastosPorNatureza, setGastosPorNatureza] = useState<GastosPorNatureza[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      // Total de gastos
      const { data: lancamentos } = await supabase
        .from("lancamentos")
        .select("valor, pago, natureza_id, naturezas(nome)")
        .eq("user_id", user?.id);

      const totalGastos = lancamentos?.reduce((acc, l) => acc + Number(l.valor), 0) || 0;
      const gastosAbertos = lancamentos?.filter(l => !l.pago).reduce((acc, l) => acc + Number(l.valor), 0) || 0;

      // Gastos do mês
      const { data: lancamentosMes } = await supabase
        .from("lancamentos")
        .select("valor")
        .eq("user_id", user?.id)
        .gte("data_lancamento", primeiroDiaMes.toISOString());

      const gastosMes = lancamentosMes?.reduce((acc, l) => acc + Number(l.valor), 0) || 0;

      // Saldo de caixa
      const { data: caixa } = await supabase
        .from("controle_caixa")
        .select("saldo_final")
        .eq("user_id", user?.id)
        .order("data", { ascending: false })
        .limit(1)
        .single();

      const saldoCaixa = caixa ? Number(caixa.saldo_final) : 0;

      // Gastos por natureza
      const naturezasMap = new Map<string, number>();
      lancamentos?.forEach((l: any) => {
        const nome = l.naturezas?.nome || "Outros";
        const atual = naturezasMap.get(nome) || 0;
        naturezasMap.set(nome, atual + Number(l.valor));
      });

      const gastosPorNat = Array.from(naturezasMap.entries()).map(([nome, total]) => ({
        nome,
        total,
      }));

      setStats({
        totalGastos,
        gastosMes,
        gastosAbertos,
        saldoCaixa,
      });
      setGastosPorNatureza(gastosPorNat);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral das suas finanças
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats.totalGastos)}
              </div>
              <p className="text-xs text-muted-foreground">Todos os lançamentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos do Mês</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {formatCurrency(stats.gastosMes)}
              </div>
              <p className="text-xs text-muted-foreground">Mês atual</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos Abertos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(stats.gastosAbertos)}
              </div>
              <p className="text-xs text-muted-foreground">Não pagos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo de Caixa</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.saldoCaixa >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(stats.saldoCaixa)}
              </div>
              <p className="text-xs text-muted-foreground">Último fechamento</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Natureza</CardTitle>
            </CardHeader>
            <CardContent>
              {gastosPorNatureza.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gastosPorNatureza}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="nome" stroke="hsl(var(--foreground))" />
                    <YAxis stroke="hsl(var(--foreground))" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              {gastosPorNatureza.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gastosPorNatureza}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.nome}: ${((entry.total / stats.totalGastos) * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {gastosPorNatureza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
