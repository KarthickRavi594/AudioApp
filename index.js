const API = require("./const");
const fs = require("fs");
var bodyParser = require("body-parser");
const admin = require("firebase-admin");
const port = process.env.PORT || 3456;
var express = require("express");
var db = require("./DB/db");
var cors = require('cors');
// const file = "./Audio/sample-2.mp3";
const multer = require("multer");
var app = express();
const fetch = require("node-fetch");
app.listen(port, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("Running in ", port);
  }
});
app.use(cors());
app.use(bodyParser.json());
admin.initializeApp({
  credential: admin.credential.cert(API.privateKey),
});
const dataBase = admin.firestore();
const headers = {
  authorization: API.API_Key,
  "transfer-encoding": "chunked",
};

var Storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, file.fieldname);
  },
});
var upload = multer({ storage: Storage });

app.get("/", async (req, response) => {
  try {
    const updateFile = await dataBase
      .collection("audio")
      .doc("cSMhjYrbto0hDrc3GmI4")
      .get();
    response.send({ CollectionDetail: updateFile.data() });
  } catch (err) {}
});
function getFirebase() {
  const updateFile = dataBase
      .collection("audio")
      .get();
    return updateFile.data();
}
function insertFirebase(insertObject) {
  dataBase.collection('audio').doc(insertObject.fileID).set(insertObject)
}
function updateFirebase(updateObject) {
  dataBase.collection('audio').doc(updateObject.fileID).update(updateObject)
}
function checkExistingRecord(existingRecord, fileName) {
  return existingRecord.filter((collection) => collection.fileName != fileName)
}
app.post(
  "/submit",
  upload.single("file"),
  async (request, responseAPI, next) => {
    try {
      let existingRecord = await getFirebase()
      const existDocument = checkExistingRecord(existingRecord, request.file.path)
      if (existDocument.length > 0){
        let uploadUrl = "";
        const file = request.file.path;
        console.log('file, ', request.file)
        const data = fs.readFileSync(file);
        const url = "https://api.assemblyai.com/v2/upload";
        const api_token = API.API_Key;
        try {
          const response = await fetch(url, {
            method: "POST",
            body: data,
            headers: {
              "Content-Type": "application/octet-stream",
              Authorization: api_token,
            },
          });
          if (response.status === 200) {
            const responseData = await response.json();
            uploadUrl = responseData["upload_url"];
          } else {
            console.error(`Error: ${response.status} - ${response.statusText}`);
          }
        } catch (error) {
          console.error(`Error: ${error}`);
        }
        if (!uploadUrl) {
          console.error(new Error("Upload failed. Please try again."));
          return;
        }
        let transcript;
        const response = await fetch("https://api.assemblyai.com/v2/transcript", {
          method: "POST",
          body: JSON.stringify({ audio_url: uploadUrl }),
          headers: {
            authorization: api_token,
            "content-type": "application/json",
          },
        });
        const responseData = await response.json();
        const transcriptId = responseData.id;
  
        const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
        let insertObject = {
          fileName: request.file.originalname,
          fileURL: pollingEndpoint,
          fileStatus: '',
          fileID: transcriptId,
          fileText: ''
        }
        insertFirebase(insertObject)
        while (true) {
          // Send a GET request to the polling endpoint to retrieve the status of the transcript
          const pollingResponse = await fetch(pollingEndpoint, { headers });
          const transcriptionResult = await pollingResponse.json();
          if (transcriptionResult.status === "completed") {
            transcript = transcriptionResult;
            insertObject.fileStatus = transcript.status
            insertObject.fileText = transcript.text
            updateFirebase(insertObject)
            break;
          }
          else if (transcriptionResult.status === "error") {
            throw new Error(`Transcription failed: ${transcriptionResult.error}`);
          }
          else {
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        }
        responseAPI.send({
          "Transcription Text": transcript.text,
        });
      } else {
        responseAPI.send({
          "Transcription Text": existDocument[0].fileText,
        });
      }
    } catch (err) {
      console.log("Err Log", err.stack);
    }
  }
);
