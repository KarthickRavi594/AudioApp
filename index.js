const axios = require("axios");
const API = require("./const");
const fs = require("fs");
var bodyParser = require("body-parser");
const { initializeApp } = require("firebase-admin/app");
const admin = require("firebase-admin");
const port = process.env.PORT || 3456;
var express = require("express");
var db = require("./DB/db");
const assembly = axios.create({
  baseURL: "https://api.assemblyai.com/v2",
  headers: {
    authorization: API.API_Key,
    "transfer-encoding": "chunked",
  },
});
const file = "./Audio/sample-2.mp3";
var app = express();
app.listen(port, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("Running in ", port);
  }
});
app.use(bodyParser.json());
admin.initializeApp({
  credential: admin.credential.cert(API.privateKey)
});
const dataBase = admin.firestore();

app.get("/", async (req, response) => {
  try {
    const updateFile = await dataBase.collection("audio").doc('cSMhjYrbto0hDrc3GmI4').get();
    response.send({ CollectionDetail: updateFile.data() });
  } catch (err) {}
});
app.get("/uploadStatus", (req, response) => {
  try {
    fs.readFile(file, (err, data) => {
      if (err) return console.error(err);

      assembly
        .post("/upload", data)
        .then((res) => {
          response.send({ upload_url: res.data.upload_url });
        })
        .catch((err) => {
          console.log("Err", err);
        });
    });
  } catch (err) {}
});
app.post("/submit", (request, response) => {
  try {
    console.log("submit => ", request.body);
    assembly
      .post("/transcript", {
        audio_url: request.body.url,
      })
      .then((res) => {
        response.send({ submittedData: res.data });
      })
      .catch((err) => console.error(err));
  } catch (err) {}
});
app.post("/transcription", (request, response) => {
  try {
    console.log("transcription => ", request.body);
    assembly
      .get(`/transcript/${request.body.id}`)
      .then((res) => {
        response.send({ uploadedData: res.data });
      })
      .catch((err) => console.error(err));
  } catch (err) {}
});
