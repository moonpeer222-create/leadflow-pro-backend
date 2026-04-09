const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = 'mysecretkey123';

app.use(cors());
app.use(express.json());

const users = new Map();
const leads = new Map();

// Default users
(async () => {
  const adminHash = await bcrypt.hash('admin123', 10);
  const demoHash = await bcrypt.hash('user123', 10);
  
  users.set('admin-001', {
    id: 'admin-001',
    email: 'admin@leadflowpro.com',
    password: adminHash,
    name: 'Admin User',
    role: 'ADMIN',
    plan: 'ENTERPRISE',
    credits: 999999,
    createdAt: new Date().toISOString()
  });
  
  users.set('user-001', {
    id: 'user-001',
    email: 'demo@leadflowpro.com',
    password: demoHash,
    name: 'Demo User',
    role: 'USER',
    plan: 'PRO',
    credits: 1000,
    createdAt: new Date().toISOString()
  });
})();

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LeadFlow Pro API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'LeadFlow Pro API' });
});

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = Array.from(users.values()).find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...withoutPassword } = user;
  res.json({ success: true, user: withoutPassword, token });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (Array.from(users.values()).find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = 'user-' + Date.now();
  const user = { id, name, email, password: hashedPassword, role: 'USER', plan: 'FREE', credits: 100, createdAt: new Date().toISOString() };
  users.set(id, user);
  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...withoutPassword } = user;
  res.status(201).json({ success: true, user: withoutPassword, token });
});

// Get current user
app.get('/api/auth/me', auth, (req, res) => {
  const user = users.get(req.userId);
  const { password, ...withoutPassword } = user;
  res.json({ success: true, user: withoutPassword });
});

// Scraper - Google Maps
app.post('/api/scraper/google-maps', auth, async (req, res) => {
  const user = users.get(req.userId);
  const results = [
    { name: "Joe's Pizza", phone: "+1 555-123-4567", email: "joe@pizza.com", rating: 4.5 },
    { name: "Tony's Pizzeria", phone: "+1 555-234-5678", email: "tony@pizza.com", rating: 4.7 },
    { name: "Mario's Kitchen", phone: "+1 555-345-6789", email: "mario@pizza.com", rating: 4.3 }
  ];
  user.credits -= 1;
  res.json({ success: true, results, remainingCredits: user.credits });
});

// Scraper - Facebook
app.post('/api/scraper/facebook', auth, (req, res) => {
  const user = users.get(req.userId);
  const results = [
    { name: "Bakery Shop", phone: "+1 555-111-2222", email: "bakery@shop.com" },
    { name: "Tech Store", phone: "+1 555-222-3333", email: "tech@store.com" }
  ];
  user.credits -= 5;
  res.json({ success: true, results, remainingCredits: user.credits });
});

// Scraper - LinkedIn
app.post('/api/scraper/linkedin', auth, (req, res) => {
  const user = users.get(req.userId);
  const results = [
    { name: "John Smith", title: "Marketing Director", company: "ABC Corp", phone: "+1 555-777-8888" },
    { name: "Sarah Johnson", title: "Sales Manager", company: "XYZ Inc", phone: "+1 555-888-9999" }
  ];
  user.credits -= 2;
  res.json({ success: true, results, remainingCredits: user.credits });
});

// Get leads
app.get('/api/leads', auth, (req, res) => {
  const userLeads = Array.from(leads.values()).filter(l => l.userId === req.userId);
  res.json({ success: true, leads: userLeads });
});

// Get plans
app.get('/api/billing/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      { id: 'free', name: 'FREE', price: 0, credits: 100 },
      { id: 'pro', name: 'PRO', price: 29, credits: 1000 },
      { id: 'enterprise', name: 'ENTERPRISE', price: 99, credits: 999999 }
    ]
  });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
