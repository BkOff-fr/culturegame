# 🎮 Améliorations Multijoueur - Culture Game

## 📋 Vue d'ensemble

Ce document détaille les améliorations apportées pour enrichir l'expérience multijoueur des modes **Survival** et **Marathon**, ainsi que l'ajout du nouveau mode **Team Survival**.

---

## ✨ Nouvelles Fonctionnalités

### 1. **Affichage des Résultats Multijoueur** 🏆

Les modes Survival et Marathon affichent maintenant les résultats détaillés après chaque question en mode multijoueur :

#### Caractéristiques :
- **Résultats par joueur** : Affichage de qui a répondu correctement/incorrectement
- **Statistiques en temps réel** :
  - Points gagnés par question
  - Temps de réponse de chaque joueur
  - Vies restantes (mode Survival)
  - Score total et série actuelle (mode Marathon)
- **Pause de 5 secondes** entre les questions pour permettre la consultation des résultats
- **Contrôle par l'hôte** : L'hôte décide quand passer à la question suivante

#### Fichiers créés :
- `/src/components/GameModes/SurvivalGamePlay.tsx` - Composant de jeu Survival avec affichage des résultats
- `/src/components/GameModes/MarathonGamePlay.tsx` - Composant de jeu Marathon avec affichage des résultats

---

### 2. **Système de Réactions Emoji** 💬

Intégration complète du système de réactions dans Survival et Marathon :

#### Fonctionnalités :
- **7 émojis disponibles** : 🔥 😰 🤔 💪 😅 🎯 ⚡
- **Affichage en temps réel** des réactions de tous les joueurs
- **Animations fluides** avec Framer Motion
- **Réactions contextuelles** pendant le jeu

#### Composants utilisés :
- `ReactionBar` - Barre de sélection des réactions
- `FloatingReactions` - Affichage animé des réactions des joueurs

---

### 3. **Micro-Challenges Contextuels** ⚡

Les micro-challenges sont maintenant adaptés au mode de jeu en cours :

#### Survival - Défis Spécifiques :
```typescript
{
  type: 'prediction',
  question: 'Qui va perdre une vie sur cette question ?',
  options: [noms des joueurs]
}
```

```typescript
{
  type: 'poll',
  question: 'Combien de joueurs vont survivre aux 5 prochaines questions ?',
  options: ['0 joueur', '1 joueur', '2 joueurs', ...]
}
```

```typescript
{
  type: 'prediction',
  question: 'Quel joueur va survivre le plus longtemps ?',
  options: [noms des joueurs]
}
```

#### Marathon - Défis Spécifiques :
```typescript
{
  type: 'prediction',
  question: 'Qui va scorer le plus sur le prochain niveau ?',
  options: [noms des joueurs]
}
```

```typescript
{
  type: 'poll',
  question: 'Qui va atteindre le niveau Expert en premier ?',
  options: [noms des joueurs]
}
```

```typescript
{
  type: 'prediction',
  question: 'Combien de joueurs vont réussir cette question ?',
  options: ['0', '1', '2', '3', '4+']
}
```

#### Fichiers modifiés :
- `/src/app/api/micro-challenges/route.ts` - API améliorée pour supporter les défis personnalisés

---

### 4. **Nouveau Mode : Team Survival** 🛡️

Mode de jeu coopératif où les équipes partagent un pool de vies commun.

#### Configuration :
```typescript
[GameMode.TEAM_SURVIVAL]: {
  name: 'Survie d\'Équipe',
  description: 'Mode survie coopératif avec vies partagées',
  icon: '🛡️',
  minPlayers: 2,
  maxPlayers: 4,
  defaultSettings: {
    sharedLives: 5,         // Vies partagées par toute l'équipe
    timeLimit: 25,          // 25 secondes par question
    livesPenalty: 1,        // Perte d'1 vie par erreur
    questionCount: -1,      // Questions illimitées
    teamSize: 2,            // 2 joueurs par équipe
    sharedScore: true       // Score partagé
  }
}
```

#### Mécanique de jeu :
- **Vies partagées** : Toute l'équipe partage un pool de 5 vies
- **Élimination collective** : Quand les vies atteignent 0, toute l'équipe est éliminée
- **Score partagé** : Tous les membres gagnent les mêmes points
- **Coordination requise** : Stratégie d'équipe essentielle pour maximiser la survie

#### Logique implémentée :
```typescript
static async processTeamSurvivalAnswer(
  gameId: string,
  teamId: string,
  isCorrect: boolean
): Promise<{ sharedLives: number; teamEliminated: boolean }>
```

#### Fichiers modifiés :
- `/prisma/schema.prisma` - Ajout de `TEAM_SURVIVAL` à l'enum `GameMode`
- `/src/lib/gameMode.ts` - Configuration et logique du mode Team Survival

---

## 🔧 Modifications Techniques

### 1. **Base de données**

#### Changements dans le schéma Prisma :
```prisma
enum GameMode {
  CLASSIC
  SURVIVAL
  DUEL
  MARATHON
  TEAM
  TEAM_SURVIVAL  // ← Nouveau mode
  DAILY
}
```

### 2. **API Micro-Challenges**

#### Support des défis personnalisés :
```typescript
// Client peut maintenant envoyer des défis personnalisés
POST /api/micro-challenges
{
  roomCode: string,
  type: 'create',
  customChallenge?: {  // ← Nouveau paramètre optionnel
    type: string,
    question: string,
    options: string[]
  }
}
```

#### Sélection automatique basée sur le mode :
```typescript
const gameMode = game.mode;
const modeChallenges = MODE_SPECIFIC_CHALLENGES[gameMode];

if (modeChallenges && modeChallenges.length > 0) {
  // Utilise les défis spécifiques au mode
  selectedChallenge = modeChallenges[Math.floor(Math.random() * modeChallenges.length)];
}
```

### 3. **Composants de jeu**

#### Architecture des nouveaux composants :

**SurvivalGamePlay** :
- Intègre `SurvivalMode` (affichage des vies, stats)
- Affiche les résultats détaillés après chaque question
- Support des réactions emoji
- Micro-challenges contextuels
- Indicateur de joueurs éliminés

**MarathonGamePlay** :
- Intègre `MarathonMode` (progression de difficulté, multiplicateurs)
- Classement en temps réel (top 5)
- Affichage du niveau de difficulté actuel
- Progression vers le niveau suivant
- Micro-challenges adaptés

---

## 📊 Comparaison Avant/Après

### Survival Mode

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| **Affichage des résultats** | ❌ Passage immédiat | ✅ Résultats détaillés + pause |
| **Réactions** | ❌ Non disponible | ✅ 7 émojis en temps réel |
| **Micro-challenges** | ❌ Challenges génériques | ✅ Défis contextuels Survival |
| **Statut des joueurs** | ❌ Basique | ✅ Vies + statut éliminé |
| **Chat** | ❌ Non intégré | ✅ Messages système (via GameContext) |

### Marathon Mode

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| **Affichage des résultats** | ❌ Passage immédiat | ✅ Résultats détaillés par niveau |
| **Réactions** | ❌ Non disponible | ✅ 7 émojis en temps réel |
| **Micro-challenges** | ❌ Challenges génériques | ✅ Défis contextuels Marathon |
| **Classement** | ❌ Basique | ✅ Top 5 en temps réel avec séries |
| **Progression** | ❌ Simple | ✅ Indicateur visuel de niveau |

---

## 🚀 Utilisation

### Pour les développeurs

#### 1. **Appliquer les migrations Prisma** :
```bash
npx prisma migrate dev --name add-team-survival-mode
npx prisma generate
```

#### 2. **Utiliser les nouveaux composants** :

```typescript
// Pour Survival Mode
import SurvivalGamePlay from '@/components/GameModes/SurvivalGamePlay'

<SurvivalGamePlay
  onGameEnd={(results) => handleGameEnd(results)}
  onLeaveGame={() => handleLeave()}
/>
```

```typescript
// Pour Marathon Mode
import MarathonGamePlay from '@/components/GameModes/MarathonGamePlay'

<MarathonGamePlay
  onGameEnd={(results) => handleGameEnd(results)}
  onLeaveGame={() => handleLeave()}
/>
```

#### 3. **Créer un micro-challenge personnalisé** :

```typescript
// Client-side
const createCustomChallenge = async (roomCode: string) => {
  await fetch('/api/micro-challenges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      roomCode,
      type: 'create',
      customChallenge: {
        type: 'poll',
        question: 'Qui va gagner ce niveau ?',
        options: playerNames
      }
    })
  })
}
```

---

## 📁 Structure des fichiers

```
src/
├── components/
│   ├── GameModes/
│   │   ├── SurvivalMode.tsx              # Existant (UI des vies)
│   │   ├── SurvivalGamePlay.tsx          # ✨ NOUVEAU (Gameplay complet)
│   │   ├── MarathonMode.tsx              # Existant (UI progression)
│   │   └── MarathonGamePlay.tsx          # ✨ NOUVEAU (Gameplay complet)
│   ├── ReactionBar.tsx                   # Existant (réutilisé)
│   ├── MicroChallenge.tsx                # Existant (réutilisé)
│   └── GamePlay.tsx                      # Existant (référence)
├── app/api/
│   └── micro-challenges/
│       └── route.ts                      # ✏️ MODIFIÉ (défis contextuels)
├── lib/
│   └── gameMode.ts                       # ✏️ MODIFIÉ (Team Survival)
└── prisma/
    └── schema.prisma                     # ✏️ MODIFIÉ (nouveau mode)
```

---

## 🎯 Fonctionnalités à venir (Options 2 & 3)

### Option 2 - Améliorations Complètes

- [ ] Power-ups interactifs en multijoueur
  - [ ] "Voler du temps" à un adversaire
  - [ ] "Protéger une vie" (Survival)
  - [ ] "Boost d'équipe" (partage de points bonus)
- [ ] Mode Spectateur
  - [ ] Joueurs éliminés peuvent regarder
  - [ ] Système de prédictions pour spectateurs
- [ ] Replay System intégré
  - [ ] Revoir les moments clés
  - [ ] Partage des meilleurs moments
- [ ] Marathon Challenge Hebdomadaire
  - [ ] Classement global
  - [ ] Récompenses hebdomadaires
- [ ] Achievements spécifiques
  - [ ] "Survivant Ultime" : 50 questions en Survival
  - [ ] "Marathonien" : Atteindre niveau Expert
  - [ ] "Sans Pitié" : Gagner un Duel sans perdre de points

### Option 3 - Nouveaux Modes

- [ ] **Battle Royale** (8 joueurs)
  - [ ] Élimination progressive (dernier à chaque question)
  - [ ] Jusqu'au dernier survivant
- [ ] **Co-op Survival** (mode coopératif)
  - [ ] Vies partagées pour tous
  - [ ] Objectif : survivre ensemble
- [ ] **Speed Ladder** (mode vitesse)
  - [ ] Questions de plus en plus rapides
  - [ ] Classement basé sur la vitesse

---

## 🐛 Notes de débogage

### Problèmes connus

1. **GameContext** : S'assurer que le polling est actif pour les mises à jour en temps réel
2. **Micro-challenges** : Vérifier l'expiration automatique (10 secondes)
3. **Team Survival** : Les vies partagées sont stockées dans `game.settings.currentSharedLives`

### Tests recommandés

- [ ] Tester Survival en solo (1 joueur)
- [ ] Tester Survival en multijoueur (2-6 joueurs)
- [ ] Tester Marathon en solo
- [ ] Tester Marathon en multijoueur (2-4 joueurs)
- [ ] Tester Team Survival (2-4 joueurs)
- [ ] Vérifier l'affichage des résultats après chaque question
- [ ] Tester les réactions emoji
- [ ] Tester les micro-challenges contextuels
- [ ] Vérifier l'élimination en mode Survival
- [ ] Vérifier la progression de difficulté en Marathon

---

## 👥 Contributeurs

- **Claude** - Implémentation des améliorations multijoueur

---

## 📝 Changelog

### Version 1.2.0 - Améliorations Multijoueur (2025-01-18)

#### Ajouté
- ✨ Affichage des résultats multijoueur pour Survival et Marathon
- ✨ Système de réactions emoji intégré dans Survival/Marathon
- ✨ Micro-challenges contextuels spécifiques par mode
- ✨ Nouveau mode **Team Survival** avec vies partagées
- ✨ Classement en temps réel pour Marathon multijoueur
- ✨ Indicateurs visuels des joueurs éliminés

#### Modifié
- 🔧 API micro-challenges pour supporter les défis personnalisés
- 🔧 gameMode.ts avec configuration Team Survival
- 🔧 Schema Prisma avec nouveau mode TEAM_SURVIVAL

#### Fichiers créés
- 📄 `/src/components/GameModes/SurvivalGamePlay.tsx`
- 📄 `/src/components/GameModes/MarathonGamePlay.tsx`
- 📄 `/MULTIPLAYER_IMPROVEMENTS.md`

---

## 📞 Support

Pour toute question ou suggestion :
- Créer une issue sur GitHub
- Consulter la documentation dans `/CLAUDE.md`

---

**Status** : ✅ **Option A (Amélioration Rapide) - TERMINÉE**

Les modes Survival et Marathon disposent maintenant de toutes les fonctionnalités sociales du mode multijoueur classique ! 🎉
