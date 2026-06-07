
La demande contient 8 chantiers majeurs. Je propose de tout livrer en 3 lots cohérents, dans le même fil, pour garder la qualité et te permettre de valider à chaque étape.

## Lot 1 — Plans, accès, onboarding mobile, charte visuelle

1. **Helper de plan** (`src/lib/plan.ts`)
   - `getUserPlan(userId)` → `'free' | 'growth' | 'partner'` via `mp_user_plans` (nouvelle table) ou défaut `free`.
   - `PLAN_FEATURES` : map des capacités (`humanSupport: 'basic' | 'dedicated'`, `voiceInput`, `pdfCertified`, `autoPublish`, `maxProjects`, `maxJustificatifs/mois`).
   - Hook `usePlan()` côté client + serverFn `getMyPlan` (avec `requireSupabaseAuth`).

2. **Limitation accompagnement humain**
   - Page `/_authenticated/support` : free → formulaire FAQ + 1 ticket/mois (table `mp_support_tickets`), growth → chat dédié (placeholder + tickets illimités, badge "dédié").
   - Composant `<PlanGate feature="dedicatedSupport">` qui montre un CTA upgrade pour le plan gratuit.

3. **Onboarding mobile**
   - Composant `OnboardingSteps` (3 écrans simples + pictos + voix off-style) déclenché au 1ᵉʳ login (flag `localStorage` + colonne `onboarded_at` profil).
   - Sur `/` mobile : `LoginCard` reste en 1ᵉʳ plan (déjà fait), ajout d'un mini-carousel "3 étapes pour commencer" sous le login, plus court.

4. **Charte visuelle — nettoyage complet**
   - Remplacer `bg-orange-500`, `text-orange-600`, `bg-orange-100`, `border-orange-300` → tokens `bg-warning`, `text-warning`, `bg-warning/10`, `border-warning/30` (déjà mappé sur or).
   - Vérifier `auth.tsx`, `score.tsx`, `dashboard.tsx`, `index.tsx`, sidebar `_authenticated/route.tsx` : tout doit utiliser `gradient-hero`, `primary`, `gold`, `sidebar-*` — pas de bleu/violet résiduel.
   - Refaire `Logo.tsx` pour que sa version dans la sidebar sombre passe en blanc (`brightness-0 invert` déjà OK) et corriger le `+` doré qui disparaît en dark.

## Lot 2 — Justificatifs, saisie vocale, publication auto

5. **Justificatifs** (bucket `documents` existant)
   - Migration : nouvelle colonne `mp_financial_records.receipt_path text`, policy storage : `documents/mp/<user_id>/...` lecture/écriture par owner.
   - UI : upload dans `_authenticated/finances.tsx` (drag & drop, image/pdf, max 5 Mo), preview + lien signé via serverFn `getReceiptUrl`.
   - Limite gratuit : 10 justificatifs/mois (lecture via `getMyPlan`).

6. **Saisie vocale** (Lovable AI Gateway)
   - Bouton micro sur le formulaire d'opération + description projet → MediaRecorder → POST `/api/voice-transcribe` (serverFn protégée) → Lovable AI Gateway `google/gemini-3-flash-preview` (audio→texte).
   - Plan gratuit : limitée à 30 transcriptions/mois (compteur `mp_voice_usage`).

7. **Publication auto → table `projects`**
   - Trigger Postgres : à chaque INSERT/UPDATE de `mp_scoring_results`, si `niveau = 'Finançable'` et `mp_projects.publish_when_eligible = true`, créer/maj une ligne dans `public.projects` (catalogue ivoireprojet.com) avec les champs essentiels (titre, secteur, montant, owner, statut `published`, source `miprojet`).
   - Toggle UI dans `_authenticated/projets.tsx` : "Publier automatiquement au catalogue IvoireProjet quand finançable".

## Lot 3 — PDF certifié + sous-domaine

8. **Rapports PDF certifiés**
   - ServerFn `generateScoreReport(projectId)` (TanStack Start) : génère un PDF (pdf-lib) avec logo, score, axes, recommandations, signature numérique (hash SHA-256 du contenu + horodatage stocké dans `mp_certifications`).
   - Page publique `/certificat/[shortId]` qui vérifie la signature et permet de re-télécharger.
   - Plan gratuit : aperçu non signé / Plan growth+ : PDF certifié.

9. **Sous-domaine `miprojet.ivoireprojet.com`**
   - Je rédige un guide pas à pas (Lovable → Publish → Custom domain → DNS CNAME chez ton registrar) — la commande DNS n'est pas exécutable depuis ici, elle se fait côté registrar.

---

### Ce que je propose
- **Démarrer maintenant le Lot 1** (qui inclut la correction obligatoire de la charte visuelle que tu réclames sur toutes les pages, l'onboarding mobile, et la séparation gratuit/croissance pour l'accompagnement humain).
- Une fois validé visuellement, j'enchaîne Lot 2 puis Lot 3 dans la même session.

Confirme « OK Lot 1 » (ou indique un ajustement) et je commence l'implémentation immédiatement.
