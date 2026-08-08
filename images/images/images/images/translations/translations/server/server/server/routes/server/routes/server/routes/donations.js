// server/routes/donations.js
const { nanoid } = require('nanoid');

module.exports = (db) => {
  const express = require('express');
  const router = express.Router();

  router.get('/', async (req,res) => {
    await db.read();
    res.json(db.data.donations || []);
  });

  router.post('/', async (req,res) => {
    await db.read();
    const payload = req.body;
    const d = { id: 'dn_' + nanoid(6), ...payload, created: new Date().toISOString() };
    db.data.donations.unshift(d);
    await db.write();
    res.json(d);
  });

  return router;
};
