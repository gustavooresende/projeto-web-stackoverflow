const client = require("mongodb").MongoClient;
const config = require("./lib/config.js");
const http = require("http");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { check, validationResult } = require("express-validator");
const content = require("./contents.js");
const path = require("path");

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
app.use(express.static(path.join(__dirname, "../views")));
app.set("views", path.join(__dirname, "../views"));
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
  res.render("index");
});

app.get("/login-page", (req, res) => {
  res.render("login");
});

app.get("/signup-page", (req, res) => {
  res.render("signup");
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
        res.end("<h1>Bem vindo " + msg.displayName + "</h1>");
      } else res.end("<h1>Usuario ou senha invalidos!</h1>");
    });
  });
});

http.createServer(app).listen(3000);
console.log("Rodando...");
