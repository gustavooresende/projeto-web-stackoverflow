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
  req.session.destroy((err) => {
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
  var filename;
  upload(req, res, (err) => {
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
        msg: "You might to fill the title, body and tags"
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
      return res.render("ask", { success: true });
    });

    // new_img.save();
    // res.json({ message: "New image added to the db!" });
  });
});

app.get("/search", (req, res) => {
  client.connect(config.uri, config.options, (err, client) => {
    if (err) throw err;
    let db = client.db(config.db);
    let search = req.query.search;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    db.collection("contents")
      .find({ title: search })
      .toArray((err, msgs) => {
        if (!msgs || msgs.length === 0) {
          if (req.session && req.session.login) {
            return res.render("show-content", { msgs: false, login: true });
          } else {
            return res.render("show-content", { msgs: false, login: false });
          }
        }
        msgs.map((msg) => {
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
        if (req.session && req.session.login) {
          return res.render("show-content", { msgs: msgs, login: true });
        } else {
          return res.render("show-content", { msgs: msgs, login: false });
        }
      });
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

http.createServer(app).listen(3000);
console.log("Rodando...");
