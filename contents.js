const client = require("mongodb").MongoClient;
const config = require("./lib/config.js");
const http = require("http");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { check, validationResult } = require("express-validator");
// client.connect(config.uri, config.options, (err, client) => {
//   if (err) throw err;
//   let db = client.db(config.db);

//   db.collection("teste").insertOne({ nome: "testeee" }, (err, msg) => {
//     if (err) throw err;
//     console.log(msg);
//   });
// });1

app.use(bodyParser.json());

app.post("/ask", (req, res) => {
  client.connect(config.uri, config.options, (err, client) => {
    if (err) throw err;
    let db = client.db(config.db);

    console.log(req.body.body);
  });
});
