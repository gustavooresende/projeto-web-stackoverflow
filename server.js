let client = require("mongodb").MongoClient;
let config = require("./lib/config.js");
let http = require("http");
let express = require("express");
let app = express();
let bodyParser = require("body-parser");
// client.connect(config.uri, config.options, (err, client) => {
//   if (err) throw err;
//   let db = client.db(config.db);

//   db.collection("teste").insertOne({ nome: "testeee" }, (err, msg) => {
//     if (err) throw err;
//     console.log(msg);
//   });
// });

app.use(bodyParser.json());

app.post("/signup", (req, res) => {
  client.connect(config.uri, config.options, (err, client) => {
    if (err) throw err;
    let db = client.db(config.db);
    // console.log(req);
    data = {
      displayName: req.body.displayName,
      email: req.body.email,
      password: req.body.password,
      street: req.body.street,
      number: req.body.number,
      complement: req.body.complement,
      city: req.body.city
    };
    if (data.complement == undefined) {
      data.complement = null;
    }
    db.collection("teste").insertOne(data, (err, msg) => {
      if (err) {
        res.end("<h1>TESTE" + err + "</h1>");
      }
      res.end("<h1>TESTE" + msg.ops + "</h1>");
    });
  });
});

http.createServer(app).listen(3000);
console.log("Rodando...");
