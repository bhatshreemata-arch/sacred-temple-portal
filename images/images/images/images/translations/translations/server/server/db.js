// server/db.js — lowdb based JSON storage
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

function initDB() {
  const file = path.join(__dirname, 'db.json');
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ bookings: [], donations: [], users: [] }, null, 2));
  }
  const adapter = new JSONFile(file);
  const db = new Low(adapter);
  return db;
}

module.exports = { initDB };
