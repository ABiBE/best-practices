
# 🧩 Intégration Jira & Suivi des Déploiements

Cette documentation décrit la stratégie mise en œuvre pour associer chaque **ticket Jira** aux **environnements dans lesquels il est déployé**, en s’appuyant sur les **métadonnées Docker**.

---

## 🎯 Objectif

Permettre à tout moment de savoir **quels tickets Jira sont présents dans chaque environnement** (`DEV`, `QUA`, `PPD`, `PROD`), de façon **automatique et traçable**.

---

## ⚙️ Build

Lors du build, chaque image Docker construite intègre un label `gitCommitName`.  
Ce label correspond au **message du commit Git** à l’origine de la build.

**Exemple :**
```yaml
gitCommitName = "ABC-123 : Ajout de la gestion des utilisateurs"
```

---

## 🚀 Déploiement

La publication de l’image dans `ACR-DEV` déclenche automatiquement le pipeline de déploiement vers `AKS-DEV`.

À la fin de ce déploiement, le système utilise le **label `gitCommitName`** pour :

- Identifier le commit Git associé  
- En extraire les identifiants de tickets Jira (via une convention de nom ex. `ABC-123 : ...`)  
- **Créer un déploiement via l’API Jira (REST)**

---

## 🔁 Promotions

La montée en environnement se fait via des **promotions successives** :

```
DEV → QUA → PPD → PROD
```

Chaque promotion déclenche un **pipeline de déploiement** sur l’environnement cible.  
L’image est alors poussée dans l’ACR correspondant (`ACR-QUA`, `ACR-PPD`, etc.).

---

## 📌 Détermination des tickets déployés

Le processus est **différentiel** : on détermine quels commits sont présents dans la **plage de promotion**.

### 🧠 Méthode

1. Récupérer les **deux dernières images** présentes dans l’ACR de l’environnement cible (ex : `QUA`)  
2. Comparer avec l’**ACR de référence** (`ACR-DEV`)  
3. Identifier les **images comprises dans l’intervalle de promotion**  
4. En extraire les **commits** → puis les **tickets Jira** → puis **notifier Jira via API**

---

### 🔍 Exemple

| ACR-DEV                            | ACR-QUA                           |
|-----------------------------------|-----------------------------------|
| `latest-20240403.6-871cac7...` ✅ | `latest-20240403.6-871cac7...` ✅ |
| `latest-20240403.4-f147e3...`     |                                   |
| `latest-20240403.3-6333aa...`     |                                   |
| `latest-20240403.2-b5442c...`     |                                   |
| `latest-20240402.1-f4e301...` ✅ | `latest-20240402.1-f4e301...` ✅ |

- **Intervalle déterminé** :  
  `latest-20240402.1-...` → `latest-20240403.6-...`

- **Commits concernés** : tous ceux situés entre ces deux images dans `ACR-DEV`

- **Extraction** : des tickets Jira via le label `gitCommitName`  
- **Création du déploiement** : via l’**API Jira (REST)**
