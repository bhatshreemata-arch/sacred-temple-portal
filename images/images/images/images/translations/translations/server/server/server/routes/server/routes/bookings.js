// server/routes/bookings.js
const { nanoid } = require('nanoid');

module.exports = (db) => {
  const express = require('express');
  const router = express.Router();

  // list
  router.get('/', async (req,res) => {
    await db.read();
    res.json(db.data.bookings || []);
  });

  // create
  router.post('/', async (req,res) => {
    await db.read();
    const payload = req.body;
    const b = { id: 'bk_' + nanoid(6), ...payload, created: new Date().toISOString() };
    db.data.bookings.unshift(b);
    await db.write();
    res.json(b);
  });

  // delete
  router.delete('/:id', async (req,res) => {
    await db.read();
    db.data.bookings = (db.data.bookings || []).filter(x => x.id !== req.params.id);
    await db.write();
    res.json({ ok:true });
  });

  return router;
};
