const express = require("express");
const axios = require("axios");
const cors = require("cors");
const qs = require("qs");

// 🔥 AXIOS
const api = axios.create({
  timeout: 7000
});

// 🔥 FIREBASE
const admin = require("firebase-admin");
const serviceAccount =
require("./serviceAccountKey.json");

admin.initializeApp({
  credential:
  admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();

app.use(cors());
app.use(express.json());

// ✅ TEST
app.get("/", (req,res)=>{
  res.send("Backend chal raha hai ✅");
});

app.get("/ping", (req,res)=>{
  res.send("OK");
});


// 🔥 START GAME
app.get("/start-game", async (req,res)=>{

  const userId = req.query.userId;
  const gameId = req.query.gameId;

  if(!userId || !gameId){

    return res.json({
      success:false,
      error:"Missing userId or gameId"
    });

  }

  try{

    // 🔥 FIND USER
    const snapshot = await db
    .collection("users")
    .where("email","==",userId)
    .get();

    if(snapshot.empty){

      return res.json({
        success:false,
        error:"User not found"
      });

    }

    const doc = snapshot.docs[0];

    let data = doc.data();

    let balance =
    Number(data.balance || 0);

    // 🔥 AUTO USERNAME
    if(!data.username){

      const autoUsername =

      data.email.split("@")[0]

      +

      Math.floor(
        1000 + Math.random() * 9000
      );

      await doc.ref.update({
        username:autoUsername
      });

      data.username = autoUsername;
    }

    const username = data.username;

    // 🔥 SAVE LIVE USER
    await db.collection("liveUsers")
    .doc(userId)
    .set({

      email:userId,
      gameId:gameId,
      username:username,
      status:"online",
      startTime:Date.now()

    });

    // 🔥 API CALL
    const response = await api.post(

      "https://game.gamblly-api.com/production/v1/gameLaunch.php",

      qs.stringify({

        member_account: username,
        game_uid: gameId,

        api_key:
        "fecfaa08d7aCodeHub944b04ac2cf59a",

        currency_code: "INR",

        language: "en",

        platform: 2,

        home_url:
        "https://2xwin.online",

        credit_amount:
        String(balance),

        transfer_id:
        Date.now().toString()

      }),

      {
        headers:{
          "Content-Type":
          "application/x-www-form-urlencoded"
        }
      }

    );

    console.log(
      "🔥 API RESPONSE:",
      response.data
    );

    const gameUrl =
    response.data?.game_url;

    // ❌ URL NOT FOUND
    if(!gameUrl){

      return res.json({

        success:false,

        error:"Game URL not received",

        providerResponse:
        response.data

      });

    }

    // ✅ RETURN JSON
    return res.json({

      success:true,
      url:gameUrl

    });

  }catch(e){

    console.log(
      "❌ ERROR:",
      e.response?.data || e.message
    );

    if(e.code === "ECONNABORTED"){

      return res.json({

        success:false,
        error:"Server slow, try again"

      });

    }

    return res.json({

      success:false,

      error:"Game server down",

      details:
      e.response?.data || e.message

    });

  }

});


// 🔥 CALLBACK
app.post("/callback", async (req,res)=>{

  console.log(
    JSON.stringify(req.body,null,2)
  );

  try{

    const data = req.body;

    const username =
    data.player_uid;

    // 🔥 FIND USER
    const snapshot = await db
    .collection("users")
    .where("username","==",username)
    .get();

    if(snapshot.empty){

      return res.json({
        status:false
      });

    }

    const doc = snapshot.docs[0];

    let balance =
    Number(doc.data().balance || 0);

    // 🔥 BET
    const betAmount = Number(

      data.bet_amount ||

      data.amount ||

      0

    );

    // 🔥 WIN
    const winAmount = Number(

      data.win_amount ||

      data.payout_amount ||

      data.payoff ||

      data.win ||

      0

    );

    console.log("🔥 BET =", betAmount);

    console.log("🔥 WIN =", winAmount);

    // 🔻 CUT BET
    balance -= betAmount;

    // ✅ ADD WIN
    balance += winAmount;

    // 🔥 SAVE BALANCE
    await doc.ref.update({
      balance:balance
    });

    // 🔥 OFFLINE SAVE
    await db.collection("liveUsers")
    .doc(doc.data().email)
    .update({

      status:"offline",
      lastSeen:Date.now()

    });

    return res.json({

      status:true,
      balance:balance

    });

  }catch(e){

    console.log(
      "CALLBACK ERROR:",
      e.message
    );

    return res.json({
      status:false
    });

  }

});


// 🔥 LIVE USERS
app.get("/admin/live-users",
async (req,res)=>{

  const snapshot =
  await db.collection("liveUsers")
  .get();

  let users = [];

  snapshot.forEach(doc=>{

    users.push(doc.data());

  });

  res.json(users);

});


// ✅ SERVER START
const PORT =
process.env.PORT || 3000;

app.listen(PORT, ()=>{

  console.log(
    "🚀 Server started on port "
    + PORT
  );

});
