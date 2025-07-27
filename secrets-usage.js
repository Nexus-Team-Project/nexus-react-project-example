const fs = require('fs');
const path = require('path');

const SECRETS_PATH = '/mnt/secrets-store';

function getSecret(secretName) {
  try {
    const secretPath = path.join(SECRETS_PATH, secretName);
    const secretValue = fs.readFileSync(secretPath, 'utf8').trim();
    console.log(`Successfully read secret: ${secretName}`);
    return secretValue;
  } catch (error) {
    console.error(`Error reading secret '${secretName}':`, error.message);
    return null;
  }
}

// Example usage based on your SecretProviderClass configuration
const dbPassword = getSecret('database-password');
const apiKey = getSecret('api-key');
const connectionString = getSecret('connection-string');

if (dbPassword) {
  console.log('Database password loaded successfully');
  // Use in your app - DON'T log the actual value
}

module.exports = { getSecret };