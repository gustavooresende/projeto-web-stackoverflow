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
    let title = req.body.title;
    let body = req.body.body;
    let tags = req.body.tags;
    let file = req.body.file;

    let data = {
      title: title,
      body: body,
      tags: tags,
      file: file
    };

    if (err) throw err;
    let db = client.db(config.db);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    db.collection("contents").insertOne(data, (err, msg) => {
      if (err) {
        return res.end("<h1>TESTE" + err + "</h1>");
      }
      res.end("<h1>TESTE" + msg.ops + "</h1>");
    });

    console.log(req.body.body);
  });
});
