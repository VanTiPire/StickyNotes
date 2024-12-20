const express = require('express');
const mongodb = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const MongoClient = mongodb.MongoClient;
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const mongoUrl = 'mongodb://localhost:27017'; 
const dbName = 'sticky_notes_app';
let db;

MongoClient.connect(mongoUrl)
  .then(client => {
    db = client.db(dbName);
    console.log(`Connected to database: ${dbName}`);
  })
  .catch(err => console.error('Database connection failed', err));


app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send('All fields are required: username, email, and password.');
  }

  try {
    const existingUser = await db.collection('users').findOne({ 
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(409).send('Username or email already in use.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({ username, email, password: hashedPassword, folders: [] });

    res.redirect('/index.html');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error registering user.');
  }
});

app.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).send('Both username/email and password are required.');
  }

  try {
    const user = await db.collection('users').findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    });

    if (!user) {
      return res.status(404).send('User not found.');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).send('Invalid credentials.');
    }

    res.json({ username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error logging in.');
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});