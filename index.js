// Require the dependencies
const express = require('express');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
const Database = require("@replit/database")
const path = require('path');
const fs = require("fs-extra");
const db = new Database()


// Create a new Express application
const app = express();

// Calling the express.json() method for parsing
app.use(express.json());

app.use(express.static('site'));

app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "https://thegaehive.fizzyizzy.repl.co");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  next();
});

// Our default cookie options
const cookieOptions = {
  path: '/',                // Send the cookie to all routes
  httpOnly: true,           // Make the cookie not accessible by document.cookie
  sameSite: 'lax',          // Allow incoming links (but not requests) to include the cookie
  secure: true,             // Make sure the cookie is secure
  maxAge: 20 * 24 * 3600 * 1000  // The cookie expires in 20 days
};

// The index page is a simple welcome, with a link to /auth
app.get('/', (req, res) => {
  res.json({"message": "Hello! Welcome to the backend for The Gaehive Site ✨"})
});

app.get('/db/managers', (req, res) => {
  res.header("Content-Type",'application/json');
  res.sendFile(path.join(__dirname, 'users.json'));
});

app.get('/db/queue', (req, res) => {
  res.header("Content-Type",'application/json');
  res.sendFile(path.join(__dirname, 'queue.json'));
});

app.put('/db/managers/add', express.json(), async (req, res) => {
  let username = req.body.username;
  let id = req.body.id;
  
  const replData = {
    name: username,
    id: id
  }

  const dt = JSON.parse(fs.readFileSync("users.json"));
  const qu = JSON.parse(fs.readFileSync("queue.json"));

  let ql = qu.data.length
  qu.data.splice(1, 0, ql);
  
  dt.push(replData);

  fs.writeFileSync("users.json", JSON.stringify(dt));
  fs.writeFileSync("queue.json", JSON.stringify(qu));
  return res.json({ ok: "done"}) 
});

app.put('/db/managers/remove', express.json(), async (req, res) => {
  let username = req.body.username;

  const dt = JSON.parse(fs.readFileSync("users.json"));
  const qu = JSON.parse(fs.readFileSync("queue.json"));

  let rm = qu.data.length - 1
  let rmi = qu.data.indexOf(rm)
    
  for ( var i = 0; i < dt.length; i++ ) {
    if (dt[i].name == username) {
      dt.splice(i, 1)
      qu.data.splice(rmi, 1)
    }
  }

  fs.writeFileSync("users.json", JSON.stringify(dt));
  fs.writeFileSync("queue.json", JSON.stringify(qu));
  return res.json({ ok: "done"}) 
});

app.get('/api/:section', (req, res) => {
  var section = req.params.section;
  db.get(section).then(function(value) {
  res.json(
    { "name": section, "status": value }
    
    );
  })
});

app.get('/user/:section', (req, res) => {
  var section = req.params.section + "-bio";
  db.get(section).then(function(value) {
  res.json(
    { "name": section, "bio": value }
    
    );
  })
});

app.post('/login', async (req, res) => {
  const result = await fetch('https://auth.itinerary.eu.org/api/auth/verifyToken?privateCode=' + req.body.privateCode);
  const json = await result.json();
  
  const user = await fetch('https://scratchdb.lefty.one/v3/user/info/' + json.username);
  const userdata = await user.json();
  
  const dt = JSON.parse(fs.readFileSync("users.json"));
    
  var manager
    
  for ( var i = 0; i < dt.length; i++ ) {
    if (dt[i].name == json.username) {
      manager = "true"
    } else {
      manager = "false"
    }
  }
  
  if (json.valid) {
    const token = jwt.sign({ name: json.username }, process.env['SECRET'], { expiresIn: '20 days' });
    
    return res.json({ token: token, username: json.username, id: userdata.id, manager: manager}) 
  } else {
    return res.json({ token: "invalid" })
  }
});

// The /auth route
app.get('/login', async (req, res) => {
  if (req.query.privateCode) {
    res.redirect('https://thegaehive.fizzyizzy.repl.co/login?privateCode=' + req.query.privateCode)
  } else {
    res.redirect(
      'https://auth.itinerary.eu.org/auth/?redirect=' +
      Buffer.from('https://gaehivecloset.fizzyizzy.repl.co/login').toString('base64') +
      '&name=the Gaehive website&authProject=867214083'
    );
  }
});

// Start the server on port 3000
app.listen(8080, () => {
  console.log('server started');
});

setInterval(showTime, 1000);
  function showTime() {
      let time = new Date();
      let hour = time.getHours();
      let min = time.getMinutes();
      let sec = time.getSeconds();

    if (hour == 12 && min == 0 && sec == 0) {
      db.list().then(keys => {
          const users = keys.toString().split(",");
          users.forEach(setOffline);
      
      function setOffline(item) {
        db.set(item, "Offline"); 
      }
    })
  }
}

  showTime();
