require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const HW = require('./src/handicap/HW/HW_handicap');
// const NBA_match = require('./src/invoke/basketball/NBA_match');
// const NBA_livescore = require('./src/invoke/basketball/NBA_livescore');
// const MLB_match = require('./src/invoke/baseball/MLB_match');
// const MLB_status = require('./src/invoke/baseball/MLB_status');
// const KBO_match = require('./src/crawler/baseball/KBO_match');
// const KBO_status = require('./src/crawler/baseball/KBO_status');
const { zone_tw } = process.env;
const { taipeiDate } = require('./src/helpers/momentUtil');
// const connection = require('./src/helpers/connection');

const app = express();

app.use(Have.haven());

// schedule.scheduleJob('0 0 11 * * *', async function() {
//  // 取得 Token
//  // HW.getToken();
// });

schedule.scheduleJob('*/10 * * * * *', async function() {
  // 取得盤口
  console.log(`Handicap run at ${taipeiDate(new Date())}`);
  await HW.getHandicap();
});

schedule.scheduleJob('文字直播', '*/3 * * * * *', zone_tw, async function() {
  try {
    // console.log(`NBA_livescore was supposed to run at ${taipeiDate(new Date())}`);
    // await NBA_livescore();
  } catch (err) {
    console.log(err);
  }
});

// If a timezone is specified, a job name must be specified as well as the first parameter.
schedule.scheduleJob('賽程', '0 */4 * * *', zone_tw, async function() {
  try {
    // console.log(`Match run at ${taipeiDate(new Date())}`);
    // await NBA_match();
    // await MLB_match();
    // await KBO_match();
  } catch (err) {
    console.log(err);
  }
});
schedule.scheduleJob('監聽賽事狀態', '0 */1 * * * *', zone_tw, async function() {
  try {
    // console.log(`Status run at ${taipeiDate(new Date())}`);
    // await NBA_match();
    // await MLB_status();
    // await KBO_status();
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
