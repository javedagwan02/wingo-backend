const express = require("express");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();

app.get("/", (req,res)=>{
  res.send("Wingo Backend Running");
});

let period30 = 20260512100051333;
let period1 = 20260512100061333;
let period3 = 20260512100081333;
let period5 = 20260512100101333;

async function createRound(type,time,period){

  let num = Math.floor(Math.random()*10);

  let color =
  [1,3,7,9].includes(num)
  ? "GREEN"
  : [2,4,6,8].includes(num)
  ? "RED"
  : "VIOLET";

  let bs = num >= 5 ? "BIG":"SMALL";

  await db.collection("wingoHistory").add({
    game:type,
    number:num,
    color:color,
    bigSmall:bs,
    period:String(period),
    time:Date.now()
  });

  await db.collection("gameRooms")
.doc(type)
.set({
  period:String(period),
  timer:time,
  result:num,
  color:color,
  bs:bs,
  status:"RUNNING"
});

  console.log(type,num);
}

setInterval(async()=>{
  await createRound("w30",30,period30);
  period30++;
},30000);

setInterval(async()=>{
  await createRound("w1",60,period1);
  period1++;
},60000);

setInterval(async()=>{
  await createRound("w3",180,period3);
  period3++;
},180000);

setInterval(async()=>{
  await createRound("w5",300,period5);
  period5++;
},300000);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server Started on port " + PORT);
});
