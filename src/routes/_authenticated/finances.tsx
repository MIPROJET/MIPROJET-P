import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects, fetchAllUserRecords } from "@/lib/data";
import { RECORD_TYPES, formatXOF, recordFlow, recordLabel } from "@/lib/financial-types";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finances")({
  head: () => ({ meta: [{ title: "Finances · MiProjet+" }] }),
  component: FinancesPage,
});

function FinancesPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>("all");

  const projectsQ = useQuery({
    queryKey: ["my-projects", user.id],
    queryFn: () => fetchMyProjects(user.id),
  });
  const recordsQ = useQuery({
    queryKey: ["all-records", user.id],
    queryFn: () => fetchAllUserRecords(user.id),
  });

  const projects = projectsQ.data ?? [];
  const records = (recordsQ.data ?? []).filter(
    (r) => filterProject === "all" || r.project_id === filterProject,
  );

  const entrees = records
    .filter((r) => recordFlow(r.record_type) === "in")
    .reduce((s, r) => s + Number(r.amount), 0);
  const sorties = records
    .filter((r) => recordFlow(r.record_type) === "out")
    .reduce((s, r) => s + Number(r.amount), 0);

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mp_financial_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-records"] });
      toast.success("Opération supprimée");
    },
  });

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4 text-center sm:p-10">
        <h1 className="text-2xl font-bold">Créez d'abord un projet</h1>
        <p className="mt-2 text-muted-foreground">
          Vous devez créer une activité avant d'enregistrer des opérations.
        </p>
        <Link to="/projets" className="inline-block mt-6">
          <Button>Aller aux projets</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 overflow-x-clip p-3 sm:p-6 lg:p-10">
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Finances</h1>
          <p className="mt-1 text-muted-foreground">
            Vos recettes, dépenses et apports. Chaque saisie alimente votre score.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:flex sm:items-center">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
                <Plus className="w-4 h-4 mr-1.5" /> Nouvelle opération
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enregistrer une opération</DialogTitle>
              </DialogHeader>
              <RecordForm
                userId={user.id}
                projects={projects}
                defaultProject={filterProject !== "all" ? filterProject : projects[0]?.id}
                onDone={() => {
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ["all-records"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <KPI label="Entrées" value={formatXOF(entrees)} color="text-success" icon={ArrowUpRight} />
        <KPI
          label="Sorties"
          value={formatXOF(sorties)}
          color="text-destructive"
          icon={ArrowDownRight}
        />
        <KPI
          label="Solde"
          value={formatXOF(entrees - sorties)}
          color={entrees - sorties >= 0 ? "text-primary" : "text-destructive"}
        />
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl bg-card border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="w-24 px-3 py-3 font-semibold sm:px-4">Date</th>
              <th className="hidden px-3 py-3 font-semibold sm:table-cell sm:px-4">Type</th>
              <th className="px-3 py-3 font-semibold sm:px-4">Description</th>
              <th className="hidden px-3 py-3 font-semibold lg:table-cell sm:px-4">Catégorie</th>
              <th className="w-28 px-3 py-3 text-right font-semibold sm:w-36 sm:px-4">Montant</th>
              <th className="w-9 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Aucune opération.
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const isIn = recordFlow(r.record_type) === "in";
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-3 text-xs text-muted-foreground sm:px-4 sm:text-sm">
                      {new Date(r.record_date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${isIn ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                      >
                        {recordLabel(r.record_type)}
                      </span>
                    </td>
                    <td className="min-w-0 break-words px-3 py-3 text-xs sm:px-4 sm:text-sm">
                      {r.description || "—"}
                    </td>
                    <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell sm:px-4">
                      {r.category || "—"}
                    </td>
                    <td
                      className={`break-words px-3 py-3 text-right text-xs font-semibold sm:px-4 sm:text-sm ${isIn ? "text-success" : "text-destructive"}`}
                    >
                      {isIn ? "+" : "−"} {formatXOF(Number(r.amount))}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => {
                          if (confirm("Supprimer ?")) deleteM.mutate(r.id);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon?: any;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-card border p-4 sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${color}`} />}
      </div>
      <div className={`mt-2 break-words text-xl font-bold leading-tight sm:text-2xl ${color}`}>
        {value}
      </div>
    </div>
  );
}

function RecordForm({
  userId,
  projects,
  defaultProject,
  onDone,
}: {
  userId: string;
  projects: any[];
  defaultProject?: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    project_id: defaultProject ?? "",
    record_type: "vente",
    category: "",
    description: "",
    amount: "",
    record_date: new Date().toISOString().slice(0, 10),
    party_name: "",
  });
  const needsParty = ["apport_associe", "pret", "don", "investissement"].includes(form.record_type);

  const m = useMutation({
    mutationFn: async () => {
      const desc =
        needsParty && form.party_name
          ? `${form.description ? form.description + " — " : ""}Source : ${form.party_name}`
          : form.description;
      const { error } = await supabase.from("mp_financial_records").insert({
        user_id: userId,
        project_id: form.project_id,
        record_type: form.record_type,
        category: form.category || null,
        description: desc || null,
        amount: Number(form.amount),
        record_date: form.record_date,
        currency: "XOF",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opération enregistrée");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <Label>Projet *</Label>
        <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Choisir un projet…" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Type d'opération *</Label>
        <Select
          value={form.record_type}
          onValueChange={(v) => setForm({ ...form, record_type: v })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECORD_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <span className={t.flow === "in" ? "text-success" : "text-destructive"}>
                  {t.flow === "in" ? "↑" : "↓"}
                </span>{" "}
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {needsParty && (
        <div>
          <Label>Nom de la source (personne ou structure) *</Label>
          <Input
            required
            value={form.party_name}
            onChange={(e) => setForm({ ...form, party_name: e.target.value })}
            className="mt-1.5"
            placeholder="ex: Konan Marcel · ou BICICI"
          />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Montant (FCFA) *</Label>
          <Input
            required
            type="number"
            min={0}
            step="any"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Date *</Label>
          <Input
            required
            type="date"
            value={form.record_date}
            onChange={(e) => setForm({ ...form, record_date: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label>Catégorie (optionnel)</Label>
        <Input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="mt-1.5"
          placeholder="ex: Matières premières, Loyer, Salaire…"
        />
      </div>
      <div>
        <Label>Description (optionnel)</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1.5"
          rows={2}
        />
      </div>
      <Button
        type="submit"
        disabled={m.isPending || !form.project_id}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {m.isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
