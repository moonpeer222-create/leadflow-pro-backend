/**
 * LeadFlow Pro - Production Backend API
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'leadflow-pro-secret-key-2024';

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '50mb' }));

// Storage
const users = new Map();
const leads = new Map();
const scraperJobs = new Map();

// Default users
(async () => {
  const adminHash = await bcrypt.hash('admin123', 10);
  const demoHash = await bcrypt.hash('user123', 10);
  
  users.set('admin-001', { id: 'admin-001', email: 'admin@leadflowpro.com', password: adminHash, name: 'Admin User', role: 'ADMIN', plan: 'ENTERPRISE', credits: 999999, createdAt: new Date().toISOString() });
  users.set('user-001', { id: 'user-001', email: 'demo@leadflowpro.com', password: demoHash, name: 'Demo User', role: 'USER', plan: 'PRO', credits: 1000, createdAt: new Date().toISOString() });
})();

// Mock results
const mockResults = {
  googleMaps: [
    { name: "Joe's Pizza Restaurant", phone: "+1 (555) 123-4567", email: "contact@joespizza.com", website: "www.joespizza.com", rating: 4.5, reviews: 234, address: "123 Main St, New York, NY", source: "google-maps", status: "NEW" },
    { name: "Pizza Palace NYC", phone: "+1 (555) 234-5678", email: "info@pizzapalace.com", website: "www.pizzapalace.com", rating: 4.2, reviews: 189, address: "456 Broadway, New York, NY", source: "google-maps", status: "NEW" },
    { name: "Tony's Authentic Pizzeria", phone: "+1 (555) 345-6789", email: "hello@tonyspizza.com", website: "www.tonyspizza.com", rating: 4.7, reviews: 312, address: "789 5th Ave, New York, NY", source: "google-maps", status: "NEW" }
  ],
  facebook: [
    { name: "Sarah's Artisan Bakery", phone: "+1 (555) 111-2222", email: "sarah@artisanbakery.com", followers: 15420, category: "Bakery", location: "Los Angeles, CA", source: "facebook", status: "NEW" },
    { name: "Tech Solutions Inc", phone: "+1 (555) 222-3333", email: "info@techsolutions.com", followers: 8934, category: "IT Services", location: "San Francisco, CA", source: "facebook", status: "NEW" }
  ],
  linkedin: [
    { name: "John Smith", title: "Marketing Director", company: "Global Corp", phone: "+1 (555) 777-8888", email: "john.smith@globalcorp.com", industry: "Technology", location: "New York, NY", source: "linkedin", status: "NEW" },
    { name: "Emily Johnson", title: "Sales Manager", company: "SalesPro Inc", phone: "+1 (555) 888-9999", email: "emily.j@salespro.com", industry: "Sales", location: "Chicago, IL", source: "linkedin", status: "NEW" }
  ]
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }));

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = Array.from(users.values()).find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, data: { user: userWithoutPassword, token } });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (Array.from(users.values()).find(u => u.email === email)) {
    return res.status(400).json({ success: false, error: 'Email already registered' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = 'user-' + Date.now();
  const user = { id, name, email, password: hashedPassword, role: 'USER', plan: 'FREE', credits: 100, createdAt: new Date().toISOString() };
  users.set(id, user);
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...userWithoutPassword } = user;
  res.status(201).json({ success: true, data: { user: userWithoutPassword, token } });
});

app.post('/api/scraper/google-maps', authenticateToken, async (req, res) => {
  const user = users.get(req.user.userId);
  const { keyword, location, maxResults = 50 } = req.body;
  const cost = Math.ceil(maxResults / 10);
  if (user.credits < cost) return res.status(400).json({ success: false, error: 'Insufficient credits' });
  
  await new Promise(r => setTimeout(r, 2000));
  const results = mockResults.googleMaps;
  results.forEach((result, i) => leads.set('lead-' + Date.now() + '-' + i, { ...result, id: 'lead-' + Date.now() + '-' + i, userId: user.id, createdAt: new Date().toISOString() }));
  user.credits -= cost;
  
  res.json({ success: true, data: { results, creditsUsed: cost, remainingCredits: user.credits } });
});

app.post('/api/scraper/facebook', authenticateToken, async (req, res) => {
  const user = users.get(req.user.userId);
  if (user.credits < 5) return res.status(400).json({ success: false, error: 'Insufficient credits' });
  
  await new Promise(r => setTimeout(r, 1500));
  const results = mockResults.facebook;
  results.forEach((result, i) => leads.set('lead-' + Date.now() + '-' + i, { ...result, id: 'lead-' + Date.now() + '-' + i, userId: user.id, createdAt: new Date().toISOString() }));
  user.credits -= 5;
  
  res.json({ success: true, data: { results, creditsUsed: 5, remainingCredits: user.credits } });
});

app.post('/api/scraper/linkedin', authenticateToken, async (req, res) => {
  const user = users.get(req.user.userId);
  const { maxResults = 50 } = req.body;
  const cost = Math.min(maxResults * 2, 100);
  if (user.credits < cost) return res.status(400).json({ success: false, error: 'Insufficient credits' });
  
  await new Promise(r => setTimeout(r, 2500));
  const results = mockResults.linkedin;
  results.forEach((result, i) => leads.set('lead-' + Date.now() + '-' + i, { ...result, id: 'lead-' + Date.now() + '-' + i, userId: user.id, createdAt: new Date().toISOString() }));
  user.credits -= cost;
  
  res.json({ success: true, data: { results, creditsUsed: cost, remainingCredits: user.credits } });
});

app.get('/api/leads', authenticateToken, (req, res) => {
  const userLeads = Array.from(leads.values()).filter(l => l.userId === req.user.userId);
  res.json({ success: true, data: userLeads });
});

app.get('/api/billing/plans', (req, res) => res.json({
  success: true,
  data: [
    { id: 'free', name: 'FREE', price: 0, credits: 100, features: ['100 credits/month', 'Basic scraping'] },
    { id: 'pro', name: 'PRO', price: 29, credits: 1000, features: ['1000 credits/month', 'All scrapers'] },
    { id: 'enterprise', name: 'ENTERPRISE', price: 99, credits: 999999, features: ['Unlimited credits', 'API access'] }
  ]
}));

app.listen(PORT, () => console.log(`🚀 LeadFlow Pro API running on port ${PORT}`));
