# SEO Log Analyzer

Outil d'analyse de logs serveur pour le SEO. Permet de visualiser et analyser le crawl des bots (Googlebot, Bingbot, etc.) sur vos sites web.

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Fonctionnalités

- **Import de logs** : Importez vos logs serveur depuis des fichiers Excel (format Apache)
- **Dashboard interactif** : Visualisez le crawl par jour, par bot, par code HTTP
- **Analyse des pages** : Identifiez les pages les plus crawlées
- **Pages orphelines** : Détectez les pages crawlées mais non présentes dans votre sitemap (import Screaming Frog)
- **Multi-clients** : Gérez plusieurs sites web dans une seule interface
- **Comparaison temporelle** : Comparez l'activité de crawl entre différentes périodes

## Prérequis

- **Python 3.10+** : [Télécharger Python](https://www.python.org/downloads/)
- **Node.js 18+** : [Télécharger Node.js](https://nodejs.org/)
- **Git** : [Télécharger Git](https://git-scm.com/downloads)

## Installation

### 1. Cloner le repository

```bash
git clone https://github.com/IsorinEmpirik/Seo-Log-Analyzer.git
cd Seo-Log-Analyzer
```

### 2. Installer le backend (Python/FastAPI)

```bash
# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Sur Windows :
venv\Scripts\activate
# Sur macOS/Linux :
source venv/bin/activate

# Installer les dépendances
pip install -r backend/requirements.txt
```

### 3. Installer le frontend (React/Vite)

```bash
cd frontend
npm install
cd ..
```

## Lancement

### Option 1 : Lanceur automatique (Windows)

Double-cliquez sur `launcher.bat` pour lancer automatiquement le backend et le frontend.

### Option 2 : Lancement manuel

**Terminal 1 - Backend :**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend :**
```bash
cd frontend
npm run dev
```

L'application sera accessible sur : **http://localhost:5173**

## Utilisation

### 1. Créer un client

Avant d'importer des logs, créez un client (= un site web) via l'interface.

### 2. Importer des logs

L'outil accepte des fichiers Excel avec :
- **Un onglet par jour** (format de date dans le nom de l'onglet)
- **Une colonne "Line"** contenant les logs Apache bruts

Exemple de format de log Apache accepté :
```
66.249.66.1 - - [20/Jan/2026:10:15:30 +0100] "GET /ma-page HTTP/1.1" 200 1234 "-" "Googlebot/2.1"
```

### 3. Importer un sitemap Screaming Frog (optionnel)

Pour détecter les pages orphelines, importez un export CSV de Screaming Frog avec une colonne "Adresse".

### 4. Analyser

Utilisez le dashboard pour :
- Voir l'évolution du crawl dans le temps
- Identifier les bots qui crawlent votre site
- Repérer les erreurs 404/500
- Trouver les pages orphelines

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Python 3.10+, FastAPI, SQLAlchemy |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Charts | Chart.js |
| Database | SQLite |

## Structure du projet

```
seo-log-analyzer/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints API
│   │   ├── core/         # Configuration DB
│   │   ├── models/       # Modèles SQLAlchemy
│   │   ├── schemas/      # Schémas Pydantic
│   │   └── services/     # Logique métier
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Composants React
│   │   ├── pages/        # Pages de l'app
│   │   └── lib/          # Utilitaires
│   └── package.json
├── data/                 # Base de données (gitignore)
├── launcher.bat          # Lanceur Windows
└── launcher.py           # Script de lancement
```

## Sécurité

- Les fichiers de base de données (`.db`) sont exclus du repository via `.gitignore`
- Aucune donnée sensible n'est stockée dans le code source
- Les fichiers Excel importés restent sur votre machine locale

## Licence

MIT License - Voir [LICENSE](LICENSE) pour plus de détails.

## Auteur

Développé par [IsorinEmpirik](https://github.com/IsorinEmpirik)
