// server/app.js — simple Express server using lowdb
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const db = initDB();

// Routes (simple)
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/bookings', require('./routes/bookings')(db));
app.use('/api/donations', require('./routes/donations')(db));

// simple health
app.get('/api/health', (req,res) => res.json({ ok:true, time: new Date() }));

app.listen(PORT, () => {
  console.log(`Temple backend running on http://localhost:${PORT}`);
});
