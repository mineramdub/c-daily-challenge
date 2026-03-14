# ⚡ C Daily Challenge

Un exercice de code C par jour, avec difficulté adaptative basée sur tes performances.

![C](https://img.shields.io/badge/language-C-blue?style=flat-square)
![Python](https://img.shields.io/badge/backend-FastAPI-green?style=flat-square)
![React](https://img.shields.io/badge/frontend-React-61dafb?style=flat-square)

---

## Fonctionnalités

- **Exercice quotidien** — un nouvel exercice chaque jour, sélectionné selon ton niveau actuel
- **Difficulté adaptative** — le niveau monte si tu réussis, descend si tu échoues (niveaux 1–10)
- **3 types d'exercices** — écrire du code, prédire la sortie, débugger du code cassé
- **Compilation en live** — ton code C est compilé et exécuté directement dans l'app via `gcc`
- **Indices progressifs** — 3 niveaux d'indices (vague → précis), chacun coûte des points
- **Scoring** — points basés sur la réussite, le temps et les indices utilisés
- **Streak & historique** — suivi de ta série de jours consécutifs et de tes 30 derniers exercices
- **Enchaîner les exercices** — après chaque exercice, passe au suivant sans attendre demain

## Sujets couverts

| Thème | Exemples |
|---|---|
| Pointeurs | Arithmétique, reverse in-place, function pointers |
| Mémoire | Struct padding, memory pool, buddy allocator |
| Algorithmes | Merge sort, KMP, AVL tree, hash table |
| Structures de données | Stack, circular buffer, trie, linked list |
| Système | Atomics, lock-free stack, mini VM |
| Optimisation | Bitwise ops, macros, strict aliasing |
| Debug | Off-by-one, double-free, use-after-free, dangling ptr |

Difficultés : de **3** (intermédiaire) à **10** (expert).

---

## Installation

### Prérequis

- Python 3.9+
- Node.js 18+
- `gcc` (macOS : `xcode-select --install`)

### Lancer l'app

```bash
git clone https://github.com/mineramdub/c-daily-challenge
cd c-daily-challenge
./start.sh
```

L'app s'ouvre automatiquement sur **http://localhost:5173**.

---

## Architecture

```
c-daily-challenge/
├── backend/
│   ├── main.py          # API FastAPI (endpoints)
│   ├── sandbox.py       # Compilation C via gcc (subprocess isolé)
│   ├── adaptive.py      # Algorithme de difficulté adaptative
│   ├── exercises_db.py  # Sélection déterministe de l'exercice du jour
│   ├── exercises.json   # Base de 30 exercices
│   └── models.py        # Modèles SQLAlchemy (SQLite)
└── frontend/
    └── src/
        ├── App.tsx              # Application principale
        └── components/
            ├── ExercisePanel    # Énoncé + markdown
            ├── HintPanel        # Indices progressifs
            ├── OutputPanel      # Résultats compilation/tests
            ├── StatsBar         # Header (niveau, streak, score)
            └── HistoryModal     # Historique des 30 derniers jours
```

## Algorithme adaptatif

La difficulté cible est recalculée après chaque exercice en fonction d'une **moyenne pondérée exponentiellement** des 7 derniers scores (les plus récents ont plus de poids) :

| Score moyen | Ajustement |
|---|---|
| ≥ 85% | +0.7 |
| ≥ 70% | +0.4 |
| ≥ 55% | +0.15 |
| ≥ 40% | 0 |
| ≥ 25% | -0.3 |
| < 25% | -0.6 |

## Scoring

```
score = (100 - coût_indices + bonus_temps) × multiplicateur_difficulté
```

- **Bonus temps** : +15 pts si < 2 min, +10 si < 5 min, +5 si < 10 min
- **Multiplicateur** : de ×0.78 (niveau 3) à ×1.5 (niveau 10)
- **Échec** : 20 pts maximum (pour l'effort)
