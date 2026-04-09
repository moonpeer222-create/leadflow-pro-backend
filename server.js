const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const users = new Map();

// Default users
(async () => {
  const hash1 = await bcrypt.hash('admin123', 10);
  const hash2 = await bcrypt.hash('user123', 10);
  users.set('1', { id: '1', email: 'admin@leadflowpro.com', password: hash1, name: 'Admin', role: 'ADMIN', credits: 9999 });
  users.set('2', { id: '2', email: 'demo@leadflowpro.com', password: hash2, name: 'Demo', role: 'USER', credits: 1000 });
})();

app.get('/', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = Array.from(users.values()).find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid' });
  }
  const token = jwt.sign({ userId: user.id }, 'secret', { expiresIn: '7d' });
  res.json({ success: true, token, user: { ...user, password: undefined } });
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));
