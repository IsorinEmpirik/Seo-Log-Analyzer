# SEO Log Analyzer - Documentation Claude

## Vue d'ensemble

Outil d'analyse de logs serveurs Googlebot pour le SEO. Permet d'importer des fichiers de logs, visualiser les crawls, détecter les pages orphelines et générer des rapports.

## Stack Technique

### Backend
- **Python 3.11+** avec **FastAPI**
- **SQLite** pour la base de données (stockage local)
- **Pandas** pour le parsing Excel/CSV

### Frontend
- **React 18** avec **Vite**
- **Tailwind CSS v4** + **shadcn/ui**
- **Chart.js** pour les visualisations
- Design : clair, professionnel, épuré

## Structure du Projet

```
seo-log-analyzer/
├── backend/
│   └── app/
│       ├── api/          # Routes FastAPI
│       ├── core/         # Config, database
│       ├── models/       # Modèles SQLAlchemy
│       ├── schemas/      # Schémas Pydantic
│       └── services/     # Logique métier (parsing, analyse)
├── frontend/
│   ├── public/           # Assets statiques (logo.ico)
│   └── src/
│       ├── components/   # Composants React
│       ├── pages/        # Pages principales
│       └── lib/          # Utilitaires
├── data/                 # Base SQLite + fichiers importés
└── .claude/
    └── skills/           # Skills de référence
```

## Modèle de Données

### Tables principales

```sql
-- Clients (multi-client)
CREATE TABLE clients (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fichiers importés
CREATE TABLE import_files (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    filename TEXT NOT NULL,
    file_type TEXT, -- 'logs' ou 'screaming_frog'
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs Crawlers (Googlebot, Bingbot, etc.)
CREATE TABLE logs (
    id INTEGER PRIMARY KEY,
    file_id INTEGER REFERENCES import_files(id),
    client_id INTEGER REFERENCES clients(id),
    timestamp TIMESTAMP NOT NULL,
    ip TEXT,
    url TEXT NOT NULL,
    http_code INTEGER,
    response_size INTEGER,
    user_agent TEXT,
    crawler TEXT, -- 'Googlebot', 'Bingbot', 'Yandexbot', etc. (auto-détecté)
    log_date DATE -- pour agrégations
);

-- URLs Screaming Frog (référence)
CREATE TABLE screaming_frog_urls (
    id INTEGER PRIMARY KEY,
    file_id INTEGER REFERENCES import_files(id),
    client_id INTEGER REFERENCES clients(id),
    url TEXT NOT NULL,
    http_code INTEGER,
    indexability TEXT
);
```

## Format des Fichiers d'Import

### Logs Googlebot (Excel)
- **Format** : `.xlsx` avec un onglet par jour
- **Colonnes** : `Date`, `Time`, `Line`
- **Line** contient le log Apache brut à parser :
  ```
  66.249.66.13 - - [20/Jan/2026:22:59:38 +0000] "GET /url HTTP/1.1" 200 29728 "-" "User-Agent"
  ```

### Screaming Frog (CSV)
- **Colonne clé** : `Adresse` (URL)
- **Autres colonnes utiles** : `Code HTTP`, `Indexabilité`

## Fonctionnalités Clés

### Dashboard Principal
- KPIs : Total crawls, Pages uniques, Codes erreur
- Graphique fréquence crawl par jour/semaine
- Distribution codes HTTP
- Top pages crawlées

### Analyse par Page
- Fréquence de crawl individuelle
- Historique des crawls
- Codes HTTP reçus

### Comparaison de Périodes
- Sélection période A vs période B
- Delta de crawls
- Évolution codes HTTP

### Pages Orphelines
- Import fichier Screaming Frog
- Comparaison avec logs Googlebot
- Liste des URLs crawlées mais absentes de SF

## Commandes de Développement

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Lancement complet (production locale)
```bash
# Script de lancement qui :
# 1. Démarre le backend
# 2. Démarre le frontend
# 3. Ouvre le navigateur
# 4. Surveille la fermeture du navigateur pour arrêter les serveurs
python launcher.py
```

## Points d'Attention

1. **Fermeture propre** : Quand l'utilisateur ferme le navigateur, tous les processus doivent s'arrêter
2. **Année des logs** : Les noms d'onglets n'ont pas l'année, déduire de la colonne Date
3. **Multi-client** : Toujours filtrer par client_id
4. **Performance** : Indexer `url`, `log_date`, `client_id`, `crawler` dans la table logs

## Crawlers Détectés

Le système détecte automatiquement le type de crawler depuis le User-Agent :
- **Googlebot** : googlebot, google-inspectiontool, storebot-google
- **Bingbot** : bingbot, msnbot, bingpreview
- **Yandexbot** : yandex, yandexbot
- **Baiduspider** : baiduspider, baidu
- **Applebot** : applebot
- **Semrushbot** : semrushbot
- **Ahrefsbot** : ahrefsbot
- **Facebookbot** : facebookexternalhit, facebot
- **Other** : tout le reste

À terme : filtrer les dashboards par crawler.

## Palette de Couleurs

Design clair, professionnel :
- Background : `#FAFAFA` (gris très clair)
- Surface : `#FFFFFF`
- Primary : `#2563EB` (bleu)
- Secondary : `#64748B` (gris ardoise)
- Success : `#10B981` (vert)
- Warning : `#F59E0B` (orange)
- Error : `#EF4444` (rouge)
- Text : `#1E293B` (gris foncé)

## Logo

Fichier : `frontend/public/logo.ico`
Utiliser ce logo unique partout : favicon, header, icône desktop.

## GitHub

- **Repo** : https://github.com/IsorinEmpirik/Seo-Log-Analyzer
- **Branche principale** : main
