let client = require("mongodb").MongoClient;
let config = require("./lib/config.js");

client.connect(config.uri, config.options, (err, client) => {
  if (err) throw err;
  let db = client.db(config.db);

  db.collection("teste").createIndex({ email: 1 }, { unique: true });
});
