
# 🧙‍♂️ Un commit pour les gouverner tous

Cette documentation définit les règles à suivre pour maintenir un **historique Git clair, lisible et traçable**, tout en assurant une bonne intégration avec Jira.

---

## ✅ 1 Pull Request = 1 Commit

Chaque pull request doit correspondre à **un seul commit**.

🎯 Objectif :
- Garder un **historique linéaire**
- Faciliter la **relecture de code**
- Améliorer la **traçabilité** des modifications

---

## 🛠️ Préparation avant la Pull Request

Avant de créer une PR vers `develop`, assurez-vous de :

1. **Rebaser** votre branche sur `origin/develop`  
   > Pour éviter les merges inutiles et garder un historique propre

2. **Squasher** vos commits si nécessaire  
   > Pour regrouper plusieurs petits changements en un seul commit cohérent

---

### 🔧 Commandes utiles

```bash
git fetch
git rebase -i origin/develop
```

---

## 📝 Format du message de commit

Tous les commits doivent suivre une **convention stricte** pour garantir la lisibilité, la traçabilité et le lien automatique avec Jira.

### 📌 Format attendu

```
[ABC-1234] titre du commit
```

### ✅ Exemple

```
[ABC-1234] migrating to Spring Boot 3.4
```

### 🧩 Plusieurs tickets concernés

Vous pouvez lister plusieurs tickets dans le message de commit si nécessaire :

```
[ABC-1234] [ABC-2345] migrating to Spring Boot 3.4
```
