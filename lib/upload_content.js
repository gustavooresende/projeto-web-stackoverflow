var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var gfs = new Schema(
  {
    img: { data: Buffer, contentType: String }
  },
  {
    timestamps: true
  }
);
module.exports = mongoose.model("gfs", gfs);
