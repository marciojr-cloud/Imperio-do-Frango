import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  data_lancamento: string;
  data_pagamento: string | null;
  pago: boolean;
  observacoes: string | null;
  naturezas: { nome: string };
  formas_pagamento: { nome: string };
}

export default function Lancamentos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [naturezas, setNaturezas] = useState<any[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    data_lancamento: new Date().toISOString().split("T")[0],
    data_pagamento: "",
    natureza_id: "",
    forma_pagamento_id: "",
    pago: false,
    observacoes: "",
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [lancamentosRes, naturezasRes, formasRes] = await Promise.all([
        supabase
          .from("lancamentos")
          .select("*, naturezas(nome), formas_pagamento(nome)")
          .eq("user_id", user?.id)
          .order("data_lancamento", { ascending: false }),
        supabase.from("naturezas").select("*").eq("user_id", user?.id),
        supabase.from("formas_pagamento").select("*").eq("user_id", user?.id),
      ]);

      setLancamentos(lancamentosRes.data || []);
      setNaturezas(naturezasRes.data || []);
      setFormasPagamento(formasRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToSave = {
        ...formData,
        valor: parseFloat(formData.valor),
        data_pagamento: formData.data_pagamento || null,
        user_id: user?.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("lancamentos")
          .update(dataToSave)
          .eq("id", editingId);

        if (error) throw error;

        toast({ title: "Lançamento atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("lancamentos").insert(dataToSave);

        if (error) throw error;

        toast({ title: "Lançamento criado com sucesso!" });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar lançamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (lancamento: Lancamento) => {
    setEditingId(lancamento.id);
    setFormData({
      descricao: lancamento.descricao,
      valor: lancamento.valor.toString(),
      data_lancamento: lancamento.data_lancamento,
      data_pagamento: lancamento.data_pagamento || "",
      natureza_id: "",
      forma_pagamento_id: "",
      pago: lancamento.pago,
      observacoes: lancamento.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;

    try {
      const { error } = await supabase.from("lancamentos").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Lançamento excluído com sucesso!" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir lançamento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePago = async (id: string, currentPago: boolean) => {
    try {
      const { error } = await supabase
        .from("lancamentos")
        .update({ pago: !currentPago, data_pagamento: !currentPago ? new Date().toISOString().split("T")[0] : null })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: !currentPago ? "Lançamento marcado como pago!" : "Lançamento marcado como não pago!",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: "",
      valor: "",
      data_lancamento: new Date().toISOString().split("T")[0],
      data_pagamento: "",
      natureza_id: "",
      forma_pagamento_id: "",
      pago: false,
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
            <p className="mt-4 text-muted-foreground">Carregando lançamentos...</p>
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
            <h2 className="text-3xl font-bold tracking-tight">Lançamentos</h2>
            <p className="text-muted-foreground">Gerencie seus gastos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Lançamento" : "Novo Lançamento"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_lancamento">Data do Lançamento *</Label>
                    <Input
                      id="data_lancamento"
                      type="date"
                      value={formData.data_lancamento}
                      onChange={(e) => setFormData({ ...formData, data_lancamento: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="natureza">Natureza *</Label>
                    <Select
                      value={formData.natureza_id}
                      onValueChange={(value) => setFormData({ ...formData, natureza_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {naturezas.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
                    <Select
                      value={formData.forma_pagamento_id}
                      onValueChange={(value) => setFormData({ ...formData, forma_pagamento_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamento.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_pagamento">Data do Pagamento</Label>
                    <Input
                      id="data_pagamento"
                      type="date"
                      value={formData.data_pagamento}
                      onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2 flex items-center space-x-2">
                    <Checkbox
                      id="pago"
                      checked={formData.pago}
                      onCheckedChange={(checked) => setFormData({ ...formData, pago: checked as boolean })}
                    />
                    <Label htmlFor="pago" className="cursor-pointer">
                      Marcar como pago
                    </Label>
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
            <CardTitle>Lista de Lançamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Natureza</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhum lançamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    lancamentos.map((lancamento) => (
                      <TableRow key={lancamento.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePago(lancamento.id, lancamento.pago)}
                          >
                            {lancamento.pago ? (
                              <Check className="h-5 w-5 text-success" />
                            ) : (
                              <X className="h-5 w-5 text-destructive" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(lancamento.data_lancamento)}
                        </TableCell>
                        <TableCell>{lancamento.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{lancamento.naturezas.nome}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{lancamento.formas_pagamento.nome}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(lancamento.valor)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(lancamento)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(lancamento.id)}
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
