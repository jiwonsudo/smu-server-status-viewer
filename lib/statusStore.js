const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'status.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function save(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

// serviceName별 상태를 기록하고, 이전 상태와 달라졌는지 여부를 함께 반환한다.
function recordStatus(serviceName, status) {
  const state = load();
  const previous = state[serviceName];
  const changed = !previous || previous.status !== status;
  const now = new Date().toISOString();

  state[serviceName] = {
    status,
    lastCheckedAt: now,
    lastChangedAt: changed ? now : previous.lastChangedAt,
  };
  save(state);

  return { changed, previousStatus: previous ? previous.status : null };
}

function getAll() {
  return load();
}

module.exports = { recordStatus, getAll };
