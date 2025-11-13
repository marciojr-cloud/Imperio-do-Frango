import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";

interface ControleCaixa {
  id: string;
  data: string;
  saldo_inicial: number;
  entradas: number;
  saidas: number;
  saldo_final: number;
  trocos: number;
  observacoes: string | null;
}

export default function Caixa() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registros, setRegistros] = useState<ControleCaixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split("T")[0],
    saldo_inicial: "",
    entradas: "",
    saidas: "",
    trocos: "",
    observacoes: "",
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from("controle_caixa")
        .select("*")
        .eq("user_id", user?.id)
        .order("data", { ascending: false });

      if (error) throw error;

      setRegistros(data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSaldoFinal = () => {
    const saldoInicial = parseFloat(formData.saldo_inicial) || 0;
    const entradas = parseFloat(formData.entradas) || 0;
    const saidas = parseFloat(formData.saidas) || 0;
    const trocos = parseFloat(formData.trocos) || 0;
    return saldoInicial + entradas - saidas - trocos;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const saldoFinal = calculateSaldoFinal();

      const dataToSave = {
        data: formData.data,
        saldo_inicial: parseFloat(formData.saldo_inicial) || 0,
        entradas: parseFloat(formData.entradas) || 0,
        saidas: parseFloat(formData.saidas) || 0,
        trocos: parseFloat(formData.trocos) || 0,
        saldo_final: saldoFinal,
        observacoes: formData.observacoes || null,
        user_id: user?.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("controle_caixa")
          .update(dataToSave)
          .eq("id", editingId);

        if (error) throw error;

        toast({ title: "Controle de caixa atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("controle_caixa").insert(dataToSave);

        if (error) throw error;

        toast({ title: "Controle de caixa criado com sucesso!" });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar controle de caixa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (registro: ControleCaixa) => {
    setEditingId(registro.id);
    setFormData({
      data: registro.data,
      saldo_inicial: registro.saldo_inicial.toString(),
      entradas: registro.entradas.toString(),
      saidas: registro.saidas.toString(),
      trocos: registro.trocos.toString(),
      observacoes: registro.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
      const { error } = await supabase.from("controle_caixa").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Registro excluído com sucesso!" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir registro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split("T")[0],
      saldo_inicial: "",
      entradas: "",
      saidas: "",
      trocos: "",
      observacoes: "",
    });
    setEditingId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando controle de caixa...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Controle de Caixa</h2>
            <p className="text-muted-foreground">Gerencie seu fluxo de caixa</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Controle de Caixa" : "Novo Controle de Caixa"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="data">Data *</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="saldo_inicial">Saldo Inicial (R$)</Label>
                    <Input
                      id="saldo_inicial"
                      type="number"
                      step="0.01"
                      value={formData.saldo_inicial}
                      onChange={(e) => setFormData({ ...formData, saldo_inicial: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entradas">Entradas (R$)</Label>
                    <Input
                      id="entradas"
                      type="number"
                      step="0.01"
                      value={formData.entradas}
                      onChange={(e) => setFormData({ ...formData, entradas: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="saidas">Saídas (R$)</Label>
                    <Input
                      id="saidas"
                      type="number"
                      step="0.01"
                      value={formData.saidas}
                      onChange={(e) => setFormData({ ...formData, saidas: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trocos">Trocos (R$)</Label>
                    <Input
                      id="trocos"
                      type="number"
                      step="0.01"
                      value={formData.trocos}
                      onChange={(e) => setFormData({ ...formData, trocos: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2 p-4 bg-accent/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Saldo Final Calculado:</div>
                    <div className={`text-2xl font-bold ${calculateSaldoFinal() >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(calculateSaldoFinal())}
                    </div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registros de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Saldo Inicial</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Trocos</TableHead>
                    <TableHead className="text-right">Saldo Final</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    registros.map((registro) => (
                      <TableRow key={registro.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatDate(registro.data)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(registro.saldo_inicial)}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {formatCurrency(registro.entradas)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatCurrency(registro.saidas)}
                        </TableCell>
                        <TableCell className="text-right text-warning">
                          {formatCurrency(registro.trocos)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${registro.saldo_final >= 0 ? "text-success" : "text-destructive"}`}>
                          {formatCurrency(registro.saldo_final)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(registro)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(registro.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
