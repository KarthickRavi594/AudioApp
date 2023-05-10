var mongoose = require("mongoose");
var fileDetail = new mongoose.Schema({
  fileName: String,
  fileType: String,
  uploadURL: String,
  id: String,
  status: String,
  text: Array,
});
module.exports = mongoose.model("AudioChat", fileDetail);
