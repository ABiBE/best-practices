# De la Pull Request à la Prod : Bonnes Pratiques CI/CD

### Une vue d'ensemble de notre stratégie de déploiement avec Azure DevOps.

Cette documentation décrit les bonnes pratiques que nous appliquons pour construire, tester et déployer nos applications de façon fiable et automatisée, du développement jusqu’à la production.

---

## 🧰 Prérequis

Notre stratégie CI/CD repose sur des conventions partagées qui garantissent la qualité, la traçabilité et la fluidité du cycle de livraison.

- **Trunk-Based Development**  
  Une seule branche active : `develop`. Les contributions se font via des pull requests fréquentes et de petite taille.

- **Un commit par ticket (avec rebase/squash)**  
  Pour chaque ticket, un seul commit est intégré dans `develop`. L’historique reste propre et lisible grâce au squash et au rebase interactif.

- **Feature flipping obligatoire**  
  Toute nouvelle fonctionnalité est protégée par un flag, ce qui permet de déployer sans impacter les utilisateurs finaux.

- **Couverture de tests ≥ 90 %**  
  Un haut niveau de couverture est requis. Les PRs qui ne respectent pas ce seuil sont automatiquement bloquées par **SonarCloud**.

---

## ✅ Pull Request & Validation

Chaque modification de code passe par une **pull request** vers `develop`, soumise à des règles strictes de validation :

- **2 reviewers minimum**
- **Analyse SonarCloud obligatoire**
  - Blocage automatique si couverture insuffisante (< 90 %) ou détection de vulnérabilités/bogs majeurs
- **Tests unitaires** lancés dans le pipeline CI
- **Merge autorisé uniquement si toutes les conditions sont remplies**

---

## ⚙️ Build

Chaque `merge` dans `develop` déclenche un pipeline CI qui produit une image Docker prête à être promue et déployée.

### Étapes du pipeline :
1. **Compilation du code**
2. **Construction de l’image Docker**
3. **Push de l’image dans `ACR-DEV`**

> L’image produite devient la source unique utilisée pour les déploiements dans tous les environnements.

---

## 🚀 Déploiement

Le déploiement est entièrement **automatisé** et repose sur des **triggers ACR**.

Chaque environnement (`DEV`, `QUA`, `PPD`, `PROD`) dispose de son propre **pipeline de déploiement**, déclenché automatiquement lors du **push d’une image dans le registre ACR correspondant**.

### 🔁 Déclenchement automatique par ACR

🧩 **Exemple** :  
Lorsqu’une image `service-a` est poussée dans `ACR-DEV`, le pipeline de déploiement de `service-a` en `AKS-DEV` est automatiquement déclenché.

| Environnement | Trigger             | Cible de déploiement |
|---------------|---------------------|-----------------------|
| `DEV`         | Push dans `ACR-DEV` | `AKS-DEV`             |
| `QUA`         | Push dans `ACR-QUA` | `AKS-QUA`             |
| `PPD`         | Push dans `ACR-PPD` | `AKS-PPD`             |
| `PROD`        | Push dans `ACR-PROD`| `AKS-PROD`            |

---

## 📦 Promotion

La **promotion** correspond au **transfert d’une image Docker** d’un registre `ACR` à un autre, sans modification de l’image.

Cela garantit que la **même image** (même SHA) traverse tous les environnements, assurant cohérence, fiabilité et reproductibilité.

### 🔁 Enchaînement des promotions

1. **Build & Push dans `ACR-DEV`**
  - À la suite du merge sur `develop`

2. ✅ **Fin du déploiement `DEV` → Promotion automatique vers `ACR-QUA`**

3. ✅ **Fin du déploiement `QUA` → Promotion automatique vers `ACR-PPD`**

4. 🔒 **Validation manuelle → Promotion vers `ACR-PROD`**
