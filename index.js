// Require the dependencies.
const express = require('express');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require("fs-extra");

// Create a new Express application.
const app = express();

// Calling the express.json() method for parsing.
app.use(express.json());

app.use(express.static('site'));

// Configure. CORS
app.use(function(req, res, next) {
  let allowedlist = ["https://gaehive.vercel.app", "https://thegaehive.fizzyizzy.repl.co"]
  let origin = req.headers.origin;
  let allowedorigins = (allowedlist.indexOf(origin) >= 0) ? origin : allowedlist[0];

  res.setHeader("Access-Control-Allow-Origin", allowedorigins);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  next();
});

// The index page is a simple welcome.
app.get('/', (req, res) => {
  res.json({ "message": "Hello! Welcome to the backend for The Gaehive Site ✨" })
});

// Where the list of managers is requested.
app.get('/db/managers', (req, res) => {
  res.header("Content-Type", 'application/json');
  res.sendFile(path.join(__dirname, 'managers.json'));
});

// Requests to here add managers to the list.
app.put('/db/managers/add', express.json(), async (req, res) => {
  let username = req.body.username;
  let token = req.body.token;

  const userinfo = await fetch('https://scratchdb.lefty.one/v3/user/info/' + username);

  const data = await userinfo.json();
  const id = data.id;

  jwt.verify(token, process.env['SECRET'], (err, complete) => {

    if (err) {
      return res.json({ error: "token expired" })
    } else {
      if (complete.manager == "true" || complete.admin == "true" && id && id !== null) {
        const replData = {
          name: username,
          id: id
        }

        const dt = JSON.parse(fs.readFileSync("managers.json"));

        dt.splice(1, 0, replData);

        fs.writeFileSync("managers.json", JSON.stringify(dt));
        return res.json({ ok: "done" })
      } else {
        return res.json({ error: "access denied" })
      }
    }
  });
});

// Requests to here remove managers from the list.
app.put('/db/managers/remove', express.json(), async (req, res) => {
  let username = req.body.username;
  let token = req.body.token;

  jwt.verify(token, process.env['SECRET'], (err, complete) => {

    if (err) {
      return res.json({ error: "token expired" })
    } else {
      if (complete.manager == "true" || complete.admin == "true") {

        const dt = JSON.parse(fs.readFileSync("managers.json"));

        for (var i = 0; i < dt.length; i++) {
          if (dt[i].name == username) {
            dt.splice(i, 1)
          }
        }

        fs.writeFileSync("managers.json", JSON.stringify(dt));
        return res.json({ ok: "done" })
      } else {
        return res.json({ error: "access denied" })
      }
    }
  });
});

// Requests to here edit the list.
app.put('/db/managers/edit', express.json(), async (req, res) => {
  let username = req.body.username;
  let pos = req.body.position;
  let token = req.body.token;

  jwt.verify(token, process.env['SECRET'], (err, complete) => {

    if (err) {
      return res.json({ error: "token expired" })
    } else {
      if (complete.manager == "true" || complete.admin == "true") {

        const dt = JSON.parse(fs.readFileSync("managers.json"));

        for (var i = 0; i < dt.length; i++) {
          if (dt[i].name == username) {
            let moved = dt.splice(i, 1)
            dt.splice(pos, 0, moved[0])
          }
        }

        fs.writeFileSync("managers.json", JSON.stringify(dt));
        return res.json({ ok: "done" })
      } else {
        return res.json({ error: "access denied" })
      }
    }
  });
});

// Requests to here add new Hivezine posts.
app.put('/hivezine/add', express.json(), async (req, res) => {
  let token = req.body.token;

  const postdata = await fetch('https://gaehive.vercel.app/api/hivezine')
  const post = await postdata.json()

  if (post.error) {
    return res.json({ error: "too many requests" })
  } else {

  jwt.verify(token, process.env['SECRET'], (err, complete) => {

    if (err) {
      return res.json({ error: "token expired" })
    } else {
      if (complete.manager == "true" || complete.admin == "true" || complete.writer == "true" && complete.name == post[0].user) {

        const list = JSON.parse(fs.readFileSync("hivezine/list.json"));
        post[0].id = list.data.length
        let listl = list.data.length
        list.data.splice(0, 0, listl);

        fs.writeFileSync("hivezine/list.json", JSON.stringify(list));

        fs.writeFileSync("hivezine/#" + listl + ".json", JSON.stringify(post));

        return res.json({ ok: "done" })
      } else {
        return res.json({ error: "access denied" })
      }
    }
  });
}});

// Requests to here delete Hivezine posts.
app.put('/hivezine/delete', express.json(), async (req, res) => {
  let id = req.body.id;
  let token = req.body.token;

  jwt.verify(token, process.env['SECRET'], (err, complete) => {

    if (err) {
      return res.json({ error: "token expired" })
    } else {
      if (complete.manager == "true" || complete.admin == "true" || complete.writer == "true") {

        fs.writeFileSync("hivezine/#" + id + ".json", "[]");

        return res.json({ ok: "done" })
      } else {
        return res.json({ error: "access denied" })
      }
    }
  });
});

// Requests to here pin Hivezine posts.
app.put('/hivezine/pin', express.json(), async (req, res) => {
  let id = req.body.id;
  let token = req.body.token;

  jwt.verify(token, process.env['SECRET'], (err, complete) => {

    if (err) {
      return res.json({ error: "token expired" })
    } else {
      if (complete.manager == "true" || complete.admin == "true" || complete.writer == "true") {

        const post = fs.readFileSync("hivezine/#" + id + ".json");
        fs.writeFileSync("hivezine/pin.json", post);

        return res.json({ ok: "done" })
      } else {
        return res.json({ error: "access denied" })
      }
    }
  });
});

// Requests to here add reactions to posts.
app.put('/hivezine/react', express.json(), async (req, res) => {
  let username = req.body.username;
  let type = req.body.type;
  let id = req.body.id;
  let token = req.body.token;

  jwt.verify(token, process.env['SECRET'], (err, complete) => {

    if (err) {
      return res.json({ error: "token expired" })
    } else {
      const react = JSON.parse(fs.readFileSync("hivezine/#" + id + ".json"));
      if (react[0][type]) {
        react[0][type] = react[0][type] + 1
      } else {
        react[0][type] = 1
      }
      
      let by = type + "by"
      if (react[0][by]) {
        react[0][by].splice(0, 0, username)
      } else {
        react[0][by] = [username]
      }
      
      fs.writeFileSync("hivezine/#" + id + ".json", JSON.stringify(react));
      return res.json({ ok: "done" })
    }
  })
});

// Where single posts are requested.
app.get('/hivezine/post/:post', (req, res) => {
  var post = req.params.post
  res.header("Content-Type", 'application/json');
  res.sendFile(path.join(__dirname, 'hivezine/#' + post + ".json"));
});

// Where all posts are requested.
app.get('/hivezine/list', (req, res) => {
  res.header("Content-Type", 'application/json');
  const posts = JSON.parse(fs.readFileSync("hivezine/list.json"));
  
  for (var i = posts.data.length - 1; i >= 0; i--) {
    if (!list) {
      var list = JSON.parse(fs.readFileSync("hivezine/#" + i + ".json"))
    } else {
    list = list.concat(JSON.parse(fs.readFileSync("hivezine/#" + i + ".json")))
    }
  }

  res.send(list);
});

// Where the pinned post is requested.
app.get('/hivezine/pin', (req, res) => {
  res.header("Content-Type", 'application/json'); res.sendFile(path.join(__dirname, "hivezine/pin.json"));
});

// Where the writers are requested.
app.get('/hivezine/writers', (req, res) => {
  res.header("Content-Type", 'application/json');
  res.sendFile(path.join(__dirname, 'writers.json'));
});

// Requests to here add new writers.
app.put('/hivezine/writers/add', express.json(), async (req, res) => {
  let username = req.body.username;
  let token = req.body.token;

  const userinfo = await fetch('https://scratchdb.lefty.one/v3/user/info/' + username);

  const data = await userinfo.json();
  const id = data.id;

  jwt.verify(token, process.env['SECRET'], (err, complete) => {

    if (err) {
      return res.json({ error: "token expired" })
    } else {
      if (complete.manager == "true" || complete.admin == "true" || complete.writer == "true" && id && id !== null) {
        const replData = {
          name: username,
          id: id
        }

        const dt = JSON.parse(fs.readFileSync("writers.json"));

        dt.splice(0, 0, replData);

        fs.writeFileSync("writers.json", JSON.stringify(dt));
        return res.json({ ok: "done" })
      } else {
        return res.json({ error: "access denied" })
      }
    }
  });
});

//Requests to here remove writers.
app.put('/hivezine/writers/remove', express.json(), async (req, res) => {
  let username = req.body.username;
  let token = req.body.token;

  jwt.verify(token, process.env['SECRET'], (err, complete) => {

    if (err) {
      return res.json({ error: "token expired" })
    } else {
      if (complete.manager == "true" || complete.admin == "true" || complete.writer == "true") {

        const dt = JSON.parse(fs.readFileSync("writers.json"));

        for (var i = 0; i < dt.length; i++) {
          if (dt[i].name == username) {
            dt.splice(i, 1)
          }
        }

        fs.writeFileSync("writers.json", JSON.stringify(dt));
        return res.json({ ok: "done" })
      } else {
        return res.json({ error: "access denied" })
      }
    }
  });
});


// Where login verification occurs.
app.post('/login', async (req, res) => {
  const result = await fetch('https://auth.itinerary.eu.org/api/auth/verifyToken?privateCode=' + req.body.privateCode);
  const json = await result.json();


  const ad = JSON.parse(fs.readFileSync("admin.json"));

  var admin

  for (var i = 0; i < ad.length; i++) {
    if (ad[i].name == json.username) {
      admin = "true";
      break;
    } else {
      admin = "false"
    }
  }
  
  const mg = JSON.parse(fs.readFileSync("managers.json"));

  var manager

  for (var i = 0; i < mg.length; i++) {
    if (mg[i].name == json.username) {
      manager = "true";
      break;
    } else {
      manager = "false"
    }
  }

  const wr = JSON.parse(fs.readFileSync("writers.json"));

  var writer

  for (var i = 0; i < wr.length; i++) {
    if (wr[i].name == json.username) {
      writer = "true";
      break;
    } else {
      writer = "false"
    }
  }

  if (json.valid) {
    const token = jwt.sign({ name: json.username, admin: admin, manager: manager, writer: writer }, process.env['SECRET'], { expiresIn: '14 days' });

    return res.json({ token: token, username: json.username, admin: admin, manager: manager, writer: writer })
  } else {
    return res.json({ token: "invalid" })
  }
});

// Start the server
app.listen(8080, () => {
  console.log('*opens closet door*');
});

