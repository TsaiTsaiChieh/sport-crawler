require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule');
const HW = require('./src/handicap/HW/HW_handicap');
const NBA_match = require('./src/invoke/baseball/NBA_match');
const NBA_livescore = require('./src/invoke/baseball/NBA_livescore');
// const connection = require('./src/helpers/connection');

const app = express();

app.use(Have.haven());

schedule.scheduleJob('0 0 11 * * *', async function() {
  // 取得 Token
  // HW.getToken();
});

schedule.scheduleJob('*/10 * * * * *', async function() {
  // 取得盤口
  HW.getHandicap();
});

schedule.scheduleJob('*/3 * * * * *', async function(fireDate) {
  try {
    // console.log(`This job was supposed to run at ${fireDate}`);
    await NBA_livescore();
  } catch (err) {
    console.log(err);
  }
});

schedule.scheduleJob('0 21 * * *', async function(fireDate) {
  try {
    console.log(`This job was supposed to run at ${fireDate} , but actually ran at ${new Date()}`);
    await NBA_match();
  } catch (err) {
    console.log(err);
  }
});

// schedule.scheduleJob('*/10 * * * * *', async function(fireDate) {
//   try {
//     console.log(`This job was supposed to run at ${fireDate} , but actually ran at ${new Date()}`);
//     await connection();
//   } catch (err) {
//     console.log(err);
//   }
// });

const { PORT } = process.env;
app.listen(PORT, function() {
  console.log(`Crawler on port: ${PORT}`);
});
