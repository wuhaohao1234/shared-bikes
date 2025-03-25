const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (replacing database)
const users = [{
  username: 'user123',
  // This is a hashed version of 'password123'
  password: '$2b$10$nfbYfgItaEUBbQ5mb1VwM.zpPHZY3PtdEy1p7Sah9reOnwYfdWcKG'
}];
const bikes = [];
const parkingSpots = [];

// JWT Secret
const JWT_SECRET = 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  
  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ message: 'Invalid password' });
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET);
  res.json({ token });
});

// Protected routes
app.get('/api/bikes', authenticateToken, (req, res) => {
  res.json(bikes);
});

app.get('/api/parking-spots', authenticateToken, (req, res) => {
  res.json(parkingSpots);
});

app.post('/api/start-ride', authenticateToken, (req, res) => {
  const { bikeId, startLocation } = req.body;
  // Implementation for starting a ride
  res.json({ message: 'Ride started successfully' });
});

app.post('/api/end-ride', authenticateToken, (req, res) => {
  const { bikeId, endLocation, duration } = req.body;
  // Implementation for ending a ride
  res.json({ message: 'Ride ended successfully' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 