import { recordFlow } from "./financial-types";

interface ProjectInput {
  has_accounting?: boolean | null;
  has_bank_account?: boolean | null;
  has_business_plan?: boolean | null;
  annual_revenue?: number | null;
  employees_count?: number | null;
  creation_date?: string | null;
}

interface RecordInput {
  record_type: string;
  amount: number;
  record_date: string;
}

export interface ScoreResult {
  score_juridique: number;
  score_financier: number;
  score_technique: number;
  score_marche: number;
  score_impact: number;
  score_global: number;
  niveau: "Finançable" | "Prometteur" | "Fragile" | "À renforcer";
  forces: string[];
  faiblesses: string[];
  recommandations: string[];
  totaux: { entrees: number; sorties: number; benefice: number; nbOperations: number };
}

export function computeScore(project: ProjectInput, records: RecordInput[]): ScoreResult {
  const entrees = records.filter((r) => recordFlow(r.record_type) === "in").reduce((s, r) => s + Number(r.amount), 0);
  const sorties = records.filter((r) => recordFlow(r.record_type) === "out").reduce((s, r) => s + Number(r.amount), 0);
  const benefice = entrees - sorties;
  const nbOperations = records.length;

  // Juridique : statut, durée d'activité
  let juridique = 30;
  if (project.creation_date) {
    const months = (Date.now() - new Date(project.creation_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    juridique += Math.min(40, months * 2);
  }
  if (project.has_bank_account) juridique += 30;
  juridique = Math.min(100, juridique);

  // Financier : régularité de saisie + bénéfice + comptabilité
  let financier = 20;
  if (project.has_accounting) financier += 25;
  financier += Math.min(35, nbOperations * 2);
  if (benefice > 0) financier += 20;
  financier = Math.min(100, financier);

  // Technique : business plan, équipe
  let technique = 30;
  if (project.has_business_plan) technique += 35;
  if ((project.employees_count ?? 0) > 0) technique += 20;
  if (nbOperations > 10) technique += 15;
  technique = Math.min(100, technique);

  // Marché : chiffre d'affaires
  let marche = 25;
  if (entrees > 0) marche += 25;
  if (entrees > 500_000) marche += 25;
  if (entrees > 5_000_000) marche += 25;
  marche = Math.min(100, marche);

  // Impact : emplois, durée
  let impact = 40 + Math.min(40, (project.employees_count ?? 0) * 8);
  if (nbOperations > 30) impact += 20;
  impact = Math.min(100, impact);

  const score_global = Math.round(
    juridique * 0.15 + financier * 0.35 + technique * 0.2 + marche * 0.2 + impact * 0.1,
  );

  let niveau: ScoreResult["niveau"];
  if (score_global >= 80) niveau = "Finançable";
  else if (score_global >= 60) niveau = "Prometteur";
  else if (score_global >= 40) niveau = "Fragile";
  else niveau = "À renforcer";

  const forces: string[] = [];
  const faiblesses: string[] = [];
  const recommandations: string[] = [];

  if (project.has_accounting) forces.push("Comptabilité tenue");
  else { faiblesses.push("Pas de comptabilité"); recommandations.push("Activer la comptabilité simplifiée"); }
  if (project.has_bank_account) forces.push("Compte bancaire actif");
  else { faiblesses.push("Pas de compte bancaire"); recommandations.push("Ouvrir un compte bancaire pour la traçabilité"); }
  if (project.has_business_plan) forces.push("Business plan disponible");
  else { faiblesses.push("Pas de business plan"); recommandations.push("Rédiger un business plan structuré"); }
  if (nbOperations >= 10) forces.push("Activité régulièrement enregistrée");
  else recommandations.push("Enregistrer vos opérations chaque jour pour bâtir l'historique");
  if (benefice > 0) forces.push("Activité bénéficiaire");
  else if (sorties > 0) faiblesses.push("Solde négatif sur la période");

  return {
    score_juridique: Math.round(juridique),
    score_financier: Math.round(financier),
    score_technique: Math.round(technique),
    score_marche: Math.round(marche),
    score_impact: Math.round(impact),
    score_global,
    niveau,
    forces,
    faiblesses,
    recommandations,
    totaux: { entrees, sorties, benefice, nbOperations },
  };
}

export function niveauColor(niveau: string): string {
  if (niveau === "Finançable") return "text-success bg-success/10 border-success/30";
  if (niveau === "Prometteur") return "text-gold bg-gold/10 border-gold/30";
  if (niveau === "Fragile") return "text-warning bg-warning/10 border-warning/30";
  return "text-destructive bg-destructive/10 border-destructive/30";
}
