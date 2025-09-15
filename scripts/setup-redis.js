const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 CultureGame - Configuration Redis\n');

// Fonction pour vérifier si Redis est installé et en marche
function checkRedis() {
  return new Promise((resolve) => {
    exec('redis-cli ping', (error, stdout) => {
      if (error) {
        resolve(false);
      } else {
        resolve(stdout.trim() === 'PONG');
      }
    });
  });
}

// Fonction pour modifier le fichier .env
function updateEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Décommenter la ligne REDIS_URL
  envContent = envContent.replace(
    /# REDIS_URL="redis:\/\/localhost:6379"/g,
    'REDIS_URL="redis://localhost:6379"'
  );

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Fichier .env mis à jour avec REDIS_URL');
}

// Fonction principale
async function main() {
  console.log('🔍 Vérification de Redis...');

  const redisRunning = await checkRedis();

  if (redisRunning) {
    console.log('✅ Redis est en marche !');
    console.log('📝 Configuration du fichier .env...');
    updateEnvFile();
    console.log('\n🎉 Configuration terminée !');
    console.log('\n📊 Testez votre configuration :');
    console.log('   1. Redémarrez votre serveur : npm run dev');
    console.log('   2. Vérifiez la santé : http://localhost:3000/api/health');
    console.log('   3. Cherchez ce log : "✅ Redis adapter initialized"');
  } else {
    console.log('❌ Redis n\'est pas disponible');
    console.log('\n📦 Options d\'installation :');
    console.log('\n🪟 Windows :');
    console.log('   1. Téléchargez : https://github.com/tporadowski/redis/releases');
    console.log('   2. Installez et démarrez Redis');
    console.log('   3. Relancez ce script');

    console.log('\n🍎 Mac :');
    console.log('   brew install redis');
    console.log('   brew services start redis');

    console.log('\n🐧 Linux (Ubuntu/Debian) :');
    console.log('   sudo apt install redis-server');
    console.log('   sudo systemctl start redis-server');

    console.log('\n☁️ Alternative - Redis Cloud (Gratuit) :');
    console.log('   1. Allez sur https://redis.com/try-free/');
    console.log('   2. Créez un compte gratuit');
    console.log('   3. Créez une base Redis');
    console.log('   4. Copiez l\'URL dans .env : REDIS_URL="votre-url-redis"');

    console.log('\n⚡ L\'application fonctionne déjà sans Redis !');
    console.log('   Redis améliore seulement les performances et le clustering.');
  }
}

main().catch(console.error);