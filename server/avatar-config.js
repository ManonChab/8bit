const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'avatar-config.json');

function readAvatarConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { style: null, background: null };
  }
}

function writeAvatarConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

module.exports = { readAvatarConfig, writeAvatarConfig };
