# 🎯 CultureGame - Jeu de Culture Multijoueur

Une application de jeu de culture moderne et minimaliste avec de nombreuses fonctionnalités multijoueurs, construite avec Next.js 15, TypeScript et Tailwind CSS.

## ✨ Fonctionnalités

### 🎮 Modes de Jeu
- **Solo** : Jouez seul contre le temps avec des questions aléatoires
- **Multijoueur** : Créez ou rejoignez des salles de jeu avec jusqu'à 4 joueurs
- **Questions personnalisées** : Créez vos propres questions avec l'éditeur intégré

### 🎯 Types de Questions Supportés
- **Choix multiple** : Questions à réponses multiples
- **Vrai/Faux** : Questions binaires
- **Réponse libre** : Saisie de texte libre
- **Ordre chronologique** : Réorganisation d'éléments (prévu)
- **Estimation** : Questions avec curseur (prévu)
- **Zones sur image** : Clic sur des zones spécifiques (prévu)
- **Association** : Relier des éléments (prévu)
- **Rapidité** : Questions de réaction (prévu)

### 🏆 Système de Score
- Points de base par question
- Bonus temporel selon la rapidité de réponse
- Système de combo (streak) pour les bonnes réponses consécutives
- Classements en temps réel

### 👥 Fonctionnalités Sociales
- Système d'authentification sécurisé
- Profils utilisateur avec avatars
- Salles de jeu partagées avec codes d'accès
- Statistiques de performance

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation

1. **Cloner et installer les dépendances**
   ```bash
   git clone <repo-url>
   cd culturegame
   npm install
   ```

2. **Configuration de la base de données**
   ```bash
   # Générer le client Prisma
   npx prisma generate
   
   # Créer et migrer la base de données
   npx prisma migrate dev --name init
   
   # Remplir avec des données d'exemple
   npx tsx prisma/seed.ts
   ```

3. **Démarrer l'application**
   ```bash
   npm run dev
   ```

L'application sera accessible sur `http://localhost:3000`

## 🎯 Guide d'Utilisation

### Première Connexion
1. Créez un compte avec un nom d'utilisateur et mot de passe
2. Choisissez votre avatar parmi les emojis disponibles
3. Vous arrivez sur le lobby principal

### Jouer en Solo
1. Cliquez sur "Jouer en Solo"
2. Répondez aux questions dans le temps imparti
3. Accumulez des points et des combos
4. Consultez vos résultats à la fin

### Jouer en Multijoueur
1. **Créer une partie** : Cliquez sur "Créer une Partie" pour obtenir un code de salle
2. **Rejoindre une partie** : Entrez un code de salle pour rejoindre une partie existante
3. **Attendre les joueurs** : L'hôte peut démarrer quand tous les joueurs sont prêts
4. **Jouer ensemble** : Répondez aux questions en compétition avec les autres

### Créer des Questions
1. Cliquez sur "Éditeur de Questions"
2. Choisissez le type de question
3. Saisissez votre question et les réponses
4. Définissez la catégorie, difficulté et points
5. Sauvegardez pour l'utiliser dans vos parties

## 🛠 Architecture Technique

### Stack Technologique
- **Frontend** : Next.js 15 avec App Router, React 19, TypeScript
- **Styling** : Tailwind CSS avec animations Framer Motion
- **Base de données** : SQLite avec Prisma ORM
- **Authentification** : JWT avec cookies sécurisés
- **UI** : Lucide React pour les icônes, design glassmorphism

### Structure du Projet
```
src/
├── app/
│   ├── api/          # Routes API (auth, games, questions)
│   ├── globals.css   # Styles globaux
│   ├── layout.tsx    # Layout principal
│   └── page.tsx      # Page d'accueil
├── components/       # Composants React
│   ├── AuthForm.tsx
│   ├── GameLobby.tsx
│   ├── GameRoom.tsx
│   ├── GamePlay.tsx
│   ├── GameResults.tsx
│   ├── QuestionEditor.tsx
│   └── QuizGame.tsx
├── hooks/           # Hooks personnalisés
│   ├── useAuth.ts
│   └── useGame.ts
└── lib/            # Utilitaires
    ├── auth.ts
    └── db.ts
prisma/
├── schema.prisma   # Schéma de base de données
└── seed.ts        # Données d'exemple
```

### Modèle de Données
- **Users** : Utilisateurs avec authentification
- **Games** : Parties multijoueurs avec codes de salle
- **Questions** : Questions avec différents types et métadonnées
- **GamePlayers** : Participation des joueurs aux parties
- **PlayerAnswers** : Réponses et scores des joueurs
- **Achievements** : Système de récompenses (prévu)
- **Leaderboards** : Classements globaux (prévu)

## 🔧 Commandes de Développement

```bash
# Développement
npm run dev

# Construction
npm run build

# Production
npm start

# Linting
npm run lint

# Base de données
npx prisma studio          # Interface graphique BDD
npx prisma migrate dev      # Nouvelles migrations
npx prisma generate         # Régénérer le client
npx tsx prisma/seed.ts     # Recharger les données
```

## 🎨 Personnalisation

### Ajouter de Nouveaux Types de Questions
1. Étendre l'enum `QuestionType` dans `prisma/schema.prisma`
2. Ajouter la logique de rendu dans `GamePlay.tsx`
3. Mettre à jour l'éditeur dans `QuestionEditor.tsx`
4. Adapter la logique de vérification des réponses

### Modifier le Thème
- Les couleurs sont définies dans `tailwind.config.js`
- Les animations sont dans les composants avec Framer Motion
- Le style glassmorphism utilise `backdrop-blur` et transparences

## 🚀 Fonctionnalités Futures

### En Cours de Développement
- [ ] WebSocket pour le multijoueur en temps réel
- [ ] Plus de types de questions (drag & drop, zones cliquables)
- [ ] Système d'amis et de défis
- [ ] Classements et statistiques avancées
- [ ] Mode tournoi
- [ ] Questions avec images
- [ ] Chat en partie
- [ ] Système de niveaux et badges

### Améliorations Techniques
- [ ] Tests automatisés
- [ ] Déploiement Docker
- [ ] Base de données PostgreSQL pour la production
- [ ] Cache Redis
- [ ] Analytics et monitoring

## 📄 Licence

Ce projet est open source sous licence MIT.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche feature
3. Commiter vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

---

**Amusez-vous bien à tester vos connaissances ! 🧠✨**
