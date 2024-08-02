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

// Other routes and logic for 1v1 PvP coinflipping game
// ...

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
