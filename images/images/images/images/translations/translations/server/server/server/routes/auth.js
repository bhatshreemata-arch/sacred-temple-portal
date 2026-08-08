// server/routes/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
  const express = require('express');
  const router = express.Router();

  // register (for demo only) - stores hashed password
  router.post('/register', async (req,res) => {
    await db.read();
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error:'missing' });
    const existing = (db.data.users || []).find(u => u.username === username);
    if (existing) return res.status(400).json({ error:'exists' });
    const hash = await bcrypt.hash(password, 8);
    db.data.users.push({ id: `u_${Date.now()}`, username, password: hash });
    await db.write();
    res.json({ ok:true });
  });

  // login: returns a simple JWT
  router.post('/login', async (req,res) => {
    await db.read();
    const { username, password } = req.body;
    const user = (db.data.users || []).find(u => u.username === username);
    if (!user) return res.status(401).json({ error:'invalid' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error:'invalid' });
    const token = jwt.sign({ sub:user.id, username:user.username }, process.env.JWT_SECRET || 'devsecret', { expiresIn:'8h' });
    res.json({ token });
  });

  return router;
};
