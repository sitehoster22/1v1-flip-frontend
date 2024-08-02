const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;
const pool = new Pool({
  user: 'your_db_user',
  host: 'your_db_host',  // e.g., 'vps.yourdomain.com'
  database: 'coinflip',
  password: 'your_db_password',
  port: 5432,
});

app.use(bodyParser.json());
app.use(cors());

const adminUser = {
  username: 'admin',
  password: 'admin998',
};

// User registration
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, hashedPassword]);
    res.json({ userId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
});

// User login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user.id }, 'your_jwt_secret');
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Authenticate admin user
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminUser.username && password === adminUser.password) {
    const token = jwt.sign({ username }, 'your_jwt_secret');
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Add balance to a user
app.post('/admin/add-balance', (req, res) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, 'your_jwt_secret', async (err, decoded) => {
    if (err) return res.status(500).json({ message: 'Failed to authenticate token' });

    const { userId, amount } = req.body;
    try {
      await pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, userId]);
      res.json({ message: 'Balance added successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error updating balance' });
    }
  });
});

// Coinflip mechanic
app.post('/coinflip', async (req, res) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, 'your_jwt_secret', async (err, decoded) => {
    if (err) return res.status(500).json({ message: 'Failed to authenticate token' });

    const { userId, amount } = req.body;
    try {
      const result = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
      const userBalance = result.rows[0].balance;

      if (userBalance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      // Deduct balance from the user
      await pool.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, userId]);

      // Simulate coin flip
      const outcome = Math.random() < 0.5 ? 'win' : 'lose';
      const winnings = outcome === 'win' ? amount * 2 : 0;

      if (outcome === 'win') {
        await pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [winnings, userId]);
      }

      res.json({ outcome, winnings });
    } catch (error) {
      res.status(500).json({ message: 'Error processing coin flip' });
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
