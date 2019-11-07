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
// client.connect(config.uri, config.options, (err, client) => {
//   if (err) throw err;
//   let db = client.db(config.db);

//   db.collection("teste").insertOne({ nome: "testeee" }, (err, msg) => {
//     if (err) throw err;
//     console.log(msg);
//   });
// });1

// app.use(bodyParser.json());
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

const conn = mongoose.createConnection(config.uri);

let gfs;

conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("contents");
});

var storage = new GridFsStorage({
  url: config.uri,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "contents"
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
    check("password").isLength({ min: 4 }),
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
        return res.status(422).json({ errors: errors.array() });
      }

      db.collection("teste").insertOne(data, (err, msg) => {
        if (err) {
          return res.end("<h1>TESTE" + err + "</h1>");
        }
        res.end("<h1>TESTE" + msg.ops + "</h1>");
      });
    });
  }
);
app.get("/", (req, res) => {
  console.log(req.session);
  if (req.session && req.session.login) {
    res.render("index", { loginStatus: "out", signup: "true" });
  }
  res.render("index", { loginStatus: "in", signup: "false" });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/ask", (req, res) => {
  res.render("ask", { success: false });
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

    db.collection("teste").findOne({ email: email }, (err, msg) => {
      if (err) {
        return res.end("<h1>TESTE" + err + "</h1>");
      }
      if (msg && msg.password == password) {
        req.session.login = email;
        return res.redirect("/");
      } else res.end("<h1>Usuario ou senha invalidos!</h1>");
    });
  });
});

app.post("/ask", (req, res) => {
  var new_img = new Img();

  upload(req, res, err => {
    if (err) {
      res.render("ask", {
        success: false,
        msg: "It wasn't possible upload the file"
      });
    } else {
      if (req.file == undefined) {
        new_img = null;
      } else {
        new_img.img.data = fs.readFileSync(req.file.path);
        new_img.img.contentType = "image/jpeg";
      }
    }
  });

  client.connect(config.uri, config.options, (err, client) => {
    let data = {
      title: req.body.title,
      body: req.body.body,
      tags: req.body.tags,
      file: new_img
    };

    if (err) throw err;
    let db = client.db(config.db);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    db.collection("contents").insertOne(data, (err, msg) => {
      if (err) {
        return res.end("<h1>" + err + "</h1>");
      }
      res.render("ask", { success: true });
    });

    // new_img.save();
    // res.json({ message: "New image added to the db!" });
  });
});

app.get("/content", (req, res) => {
  client.connect(config.uri, config.options, (err, client) => {
    if (err) throw err;
    let db = client.db(config.db);
    console.log("bla");
    Img.findOne({ title: "safsfasaf" }, function(err, img) {
      if (err) res.send(err);
      res.contentType("json");
      res.render("show-content", { file: img });
      console.log("q");
    });
  });
});

http.createServer(app).listen(3000);
console.log("Rodando...");
