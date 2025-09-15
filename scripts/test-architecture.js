const http = require('http');

console.log('🧪 Test de l\'Architecture CultureGame\n');

// Test de santé de l'application
function testHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/api/health', (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          resolve(health);
        } catch (error) {
          reject(new Error('Réponse JSON invalide'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout - Le serveur ne répond pas'));
    });
  });
}

// Fonction principale de test
async function runTests() {
  console.log('🔍 Vérification que le serveur est démarré...');

  try {
    const health = await testHealth();

    console.log('✅ Serveur démarré avec succès !');
    console.log(`📊 Status: ${health.status}`);
    console.log(`⏱️  Temps de réponse: ${health.responseTime}`);
    console.log(`⏰ Uptime: ${health.uptime}`);

    // Vérification des composants
    console.log('\n🔧 État des composants :');

    if (health.checks) {
      const dbStatus = health.checks.database ? '✅' : '❌';
      const redisStatus = health.checks.redis ? '✅' : '⚠️';
      const memoryStatus = health.checks.memory ? '✅' : '⚠️';

      console.log(`   Base de données: ${dbStatus} ${health.checks.database ? 'Connectée' : 'Déconnectée'}`);
      console.log(`   Redis: ${redisStatus} ${health.checks.redis ? 'Connecté' : 'Déconnecté (mode fallback)'}`);
      console.log(`   Mémoire: ${memoryStatus} ${health.checks.memory ? 'OK' : 'Élevée'}`);
    }

    // Métriques de performance
    if (health.metrics) {
      console.log('\n📈 Métriques de performance :');
      console.log(`   Connexions actives: ${health.metrics.connections || 0}`);
      console.log(`   Parties en cours: ${health.metrics.activeGames || 0}`);
      console.log(`   Messages/seconde: ${health.metrics.messagesPerSecond || 0}`);
      console.log(`   Temps de réponse moyen: ${health.metrics.avgResponseTime || 0}ms`);
      console.log(`   Taux d'erreur: ${health.metrics.errorRate || 0}/min`);
    }

    // Usage mémoire
    if (health.memory) {
      console.log('\n💾 Usage mémoire :');
      console.log(`   RSS: ${health.memory.rss}MB`);
      console.log(`   Heap utilisé: ${health.memory.heapUsed}MB`);
      console.log(`   Heap total: ${health.memory.heapTotal}MB`);
    }

    // Recommandations
    console.log('\n💡 Recommandations :');

    if (!health.checks?.redis) {
      console.log('   ⚡ Installez Redis pour de meilleures performances');
      console.log('   📝 Utilisez: npm run setup:redis');
    }

    if (health.metrics?.avgResponseTime > 200) {
      console.log('   🐌 Temps de réponse élevé - vérifiez les requêtes DB');
    }

    if (health.memory?.heapUsed > 200) {
      console.log('   💾 Usage mémoire élevé - surveillez les fuites');
    }

    console.log('\n🎉 Architecture prête pour la production !');
    console.log('\n📚 Prochaines étapes :');
    console.log('   1. Testez votre jeu en mode multijoueur');
    console.log('   2. Surveillez http://localhost:3000/api/health');
    console.log('   3. Consultez ARCHITECTURE-GUIDE.md pour plus d\'infos');

  } catch (error) {
    console.log('❌ Erreur lors du test de santé :');

    if (error.code === 'ECONNREFUSED') {
      console.log('   🚫 Le serveur n\'est pas démarré');
      console.log('   💡 Démarrez-le avec: npm run dev');
    } else {
      console.log(`   📝 Détails: ${error.message}`);
    }

    console.log('\n🔧 Vérifications à faire :');
    console.log('   1. Le serveur est-il démarré ? (npm run dev)');
    console.log('   2. Le port 3000 est-il libre ?');
    console.log('   3. Y a-t-il des erreurs dans les logs ?');

    process.exit(1);
  }
}

// Point d'entrée
runTests().catch((error) => {
  console.error('❌ Erreur inattendue :', error);
  process.exit(1);
});