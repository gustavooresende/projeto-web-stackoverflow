const client = require("mongodb").MongoClient;
const config = require("./lib/config.js");
const http = require("http");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { check, validationResult } = require("express-validator");
const path = require("path");
const session = require("express-session");

const mongoose = require("mongoose");
const Img = require("./lib/upload_content");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "abobrinha",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

const conn = mongoose.createConnection(config.project_uri);

// Init gfs
let gfs;

conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

var storage = new GridFsStorage({
  url: config.project_uri,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads"
        };
        resolve(fileInfo);
      });
    });
  }
});

// const storage = multer.diskStorage({
//   destination: function(req, res, cb) {
//     cb(null, "uploads/");
//   },
//   filename: function(req, file, cb) {
//     cb(
//       null,
//       file.fieldname + "-" + Date.now() + path.extname(file.originalname)
//     );
//   }
// });

const upload = multer({ storage: storage }).single("image");

app.post(
  "/signup",
  [
    check("email").isEmail(),
    check("password").isLength({ min: 1 }),
    check("displayName").isLength({ min: 1 }),
    check("street").isLength({ min: 1 }),
    check("number").isLength({ min: 1 }),
    check("city").isLength({ min: 1 })
  ],
  (req, res) => {
    client.connect(config.uri, config.options, (err, client) => {
      if (err) throw err;
      let db = client.db(config.db);
      data = {
        displayName: req.body.displayName,
        email: req.body.email,
        password: req.body.password,
        street: req.body.street,
        number: req.body.number,
        complement: req.body.complement,
        city: req.body.city
      };

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render("signup", { fail: true });
      }

      db.collection("users").insertOne(data, (err, msg) => {
        if (err) {
          return res.render("signup", { emailFail: true });
        }
        req.session.login = data.email;
        return res.redirect("/");
      });
    });
  }
);
app.get("/", (req, res) => {
  if (req.session && req.session.login) {
    return res.render("index", { login: true });
  }
  res.render("index", { login: false });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    return res.redirect("/");
  });
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/ask", (req, res) => {
  if (req.session && req.session.login) {
    return res.render("ask", { login: true, success: false });
  } else {
    res.redirect("login");
  }
});

app.post("/counterAsks", (req, res) => {
  var changed = false;
  client.connect(config.uri, config.options, (err, client) => {
    if (err) throw err;
    let db = client.db(config.db);

    let n_asks = req.body.n_asks;

    n_returned = db
      .collection("contents")
      .find({})
      .count()
      .then(n_returned => {
        if (n_returned != n_asks) {
          changed = true;
        }
        return res
          .status(200)
          .json({ changed: changed, number: n_returned })
          .end();
      });

    // console.log(n_returned);
  });
});

app.post("/login", (req, res) => {
  client.connect(config.uri, config.options, (err, client) => {
    if (err) throw err;
    let db = client.db(config.db);

    let email = req.body.email;
    let password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    db.collection("users").findOne({ email: email }, (err, msg) => {
      if (err) {
        return res.end("<h1>TESTE" + err + "</h1>");
      }
      if (msg && msg.password == password) {
        req.session.login = email;
        return res.redirect("/");
      } else res.render("login", { fail: true });
    });
  });
});

app.post("/ask", (req, res) => {
  if (req.session && req.session.login) {
    var filename;
    upload(req, res, err => {
      if (err) {
        res.render("ask", {
          success: false,
          error: true,
          msg: "It wasn't possible upload the file",
          login: true
        });
      } else {
        if (req.file == undefined) {
          filename = null;
        } else {
          filename = req.file.filename;
        }
      }
    });

    client.connect(config.uri, config.options, (err, client) => {
      let data = {
        title: req.body.title,
        body: req.body.body,
        tags: req.body.tags,
        file: filename
      };

      if (err) throw err;
      let db = client.db(config.db);

      if (
        !(data.title.length > 0) ||
        !(data.body.length > 0) ||
        !(data.tags.length > 0)
      ) {
        return res.render("ask", {
          success: false,
          error: true,
          login: true,
          msg: "You might fill the title, body and tags"
        });
      }
      // if (data.title.length == 0) {
      // }

      db.collection("contents").insertOne(data, (err, msg) => {
        if (err) {
          return res.render("ask", {
            success: false,
            login: true,
            msg: "It wasn't possible to post in BD"
          });
        }
        return res.render("ask", { success: true, login: true });
      });

      // new_img.save();
      // res.json({ message: "New image added to the db!" });
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/frames", (req, res) => {
  client.connect(config.uri, config.options, (err, client) => {
    let counter = Number(req.query.counter);
    if (!counter) {
      counter = 0;
    }
    console.log("q");
    if (err) throw err;
    let db = client.db(config.db);
    let search = req.query.search;

    console.log(search);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    console.log("ta vindo");

    db.collection("contents")
      .find({ title: search })
      .limit(4)
      .skip(counter)
      .toArray((err, msgs) => {
        if (!msgs || msgs.length === 0) {
          return res
            .status(200)
            .json({ msgs: false })
            .end();
        }
        msgs.map(msg => {
          if (msg.file != null) {
            gfs.files.findOne({ filename: msg.file }, (err, file) => {
              if (
                msg.contentType === "image/jpeg" ||
                msg.contentType === "image/png"
              ) {
                msg.isImage = true;
              } else {
                msg.isImage = false;
              }
            });
          }
        });
        return res
          .status(200)
          .json({ msgs: msgs })
          .end();
      });
  });
});

app.get("/search", (req, res) => {
  client.connect(config.uri, config.options, (err, client) => {
    if (err) throw err;
    let db = client.db(config.db);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    if (req.session && req.session.login) {
      return res.render("show-content", { login: true });
    } else {
      return res.render("show-content", { login: false });
    }
  });
});

app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists"
      });
    }

    // Check if image
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not an image"
      });
    }
  });
});

app.get("/liveSearch", (req, res) => {
  let text = req.query.text;
  regexText = `^${text}.*`;
  regex = new RegExp(regexText, "i");
  client.connect(config.uri, config.options, (err, client) => {
    if (err) throw err;
    let db = client.db(config.db);

    db.collection("contents")
      .find({ title: regex })
      .limit(4)
      .toArray((err, msg) => {
        if (err) {
          return res.end("<h1>TESTE" + err + "</h1>");
        }
        if (text != "") {
          return res
            .status(200)
            .json({ msg })
            .end();
        } else {
          res.end();
        }
      });
  });
});

const port = process.env.PORT || 5000;

http.createServer(app).listen(port);
console.log("Rodando...");
