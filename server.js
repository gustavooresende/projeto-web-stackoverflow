const client = require("mongodb").MongoClient;
const config = require("./lib/config.js");
const http = require("http");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { check, validationResult } = require("express-validator");
const path = require("path");
const session = require("express-session");

// client.connect(config.uri, config.options, (err, client) => {
//   if (err) throw err;
//   let db = client.db(config.db);

//   db.collection("teste").insertOne({ nome: "testeee" }, (err, msg) => {
//     if (err) throw err;
//     console.log(msg);
//   });
// });1

const Img = require("./lib/upload_content");

const fs = require("fs");

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function(req, res, cb) {
    cb(null, "uploads/");
  }
});

const upload = multer({ storage: storage });

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
      if (msg.password == password) {
        req.session.login = email;
        return res.redirect("/");
      } else res.end("<h1>Usuario ou senha invalidos!</h1>");
    });
  });
});

app.post("/ask", upload.single("image"), (req, res) => {
  console.log(req.file);
  client.connect(config.uri, config.options, (err, client) => {
    var new_img = new Img();
    new_img.img.data = fs.readFileSync(req.file.path);
    new_img.img.contentType = "image/jpeg";

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

http.createServer(app).listen(3000);
console.log("Rodando...");
