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

app.get('/api/folders', async (req, res) => {
  const { username, filter } = req.query;

  if (!username) {
    return res.status(400).send('Username is required.');
  }

  try {
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    const folders = user.folders;

    let filteredFolders;
    if (filter === 'today') {
      filteredFolders = folders.filter(folder => {
        const createdDate = new Date(folder.createdAt);
        const today = new Date();
        return createdDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
      });
    } else if (filter === 'week') {
      filteredFolders = folders.filter(folder => {
        const createdDate = new Date(folder.createdAt);
        const today = new Date();
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const lastDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        return createdDate >= firstDayOfWeek && createdDate <= lastDayOfWeek;
      });
    } else if (filter === 'month') {
      filteredFolders = folders.filter(folder => {
        const createdDate = new Date(folder.createdAt);
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return createdDate >= firstDayOfMonth && createdDate <= lastDayOfMonth;
      });
    } else {
      filteredFolders = folders;
    }

    res.json(filteredFolders.map(folder => ({
      name: folder.name,
      color: folder.color,
      createdAt: folder.createdAt,
    })));
  } catch (err) {
    console.error('Error fetching folders:', err);
    res.status(500).send('Error fetching folders.');
  }
});


app.post('/api/folders', async (req, res) => {
  const { username, folderName, color } = req.body;

  if (!username || !folderName || !color) {
    return res.status(400).send('Username, folder name, and color are required.');
  }

  try {
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    const newFolder = {
      name: folderName,
      color,
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').updateOne(
      { username },
      { $push: { folders: newFolder } }
    );

    res.json({ createdAt: newFolder.createdAt });
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).send('Error creating folder.');
  }
});


app.post('/api/folders/update', async (req, res) => {
  const { username, currentName, newName, newColor } = req.body;

  if (!username || !currentName || !newName || !newColor) {
    return res.status(400).send('Username, current folder name, new folder name, and color are required.');
  }

  try {
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    await db.collection('users').updateOne(
      { username, "folders.name": currentName },
      { $set: { "folders.$.name": newName, "folders.$.color": newColor } }
    );

    res.send('Folder updated successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating folder.');
  }
});

app.delete('/api/folders/delete', async (req, res) => {
  const { username, folderName } = req.body;

  if (!username || !folderName) {
    return res.status(400).send('Username and folder name are required.');
  }

  try {
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    await db.collection('users').updateOne(
      { username },
      { $pull: { folders: { name: folderName } } } 
    );

    res.send('Folder deleted successfully.');
  } catch (err) {
    console.error('Error deleting folder:', err);
    res.status(500).send('Error deleting folder.');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
