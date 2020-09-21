require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const HW = require('./src/handicap/HW/HW_handicap');
const NBA_match = require('./src/invoke/basketball/NBA_match');
const NBA_livescore = require('./src/invoke/basketball/NBA_livescore');
const MLB_match = require('./src/invoke/baseball/MLB_match');
const MLB_status = require('./src/invoke/baseball/MLB_status');
const KBO_match = require('./src/crawler/baseball/KBO_match');
const KBO_status = require('./src/crawler/baseball/KBO_status');
const NPB_match = require('./src/crawler/baseball/NPB_match');
const { zone_tw } = process.env;
const { PORT } = process.env;
// const connection = require('./src/helpers/connection');

const app = express();

app.use(Have.haven());

schedule.scheduleJob('*/10 * * * * *', async function() {
  // 取得盤口
  await HW.getHandicap();
});

schedule.scheduleJob('文字直播', '*/3 * * * * *', zone_tw, async function() {
  try {
    await NBA_livescore();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('賽程', '0 */4 * * *', zone_tw, async function() {
  try {
    await NBA_match();
    await MLB_match();
    await KBO_match();
    await NPB_match();
  } catch (err) {
    console.log(err);
    return err;
  }
});
schedule.scheduleJob('監聽賽事狀態', '0 */1 * * * *', zone_tw, async function() {
  try {
    await MLB_status();
    await KBO_status();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

// schedule.scheduleJob('*/10 * * * * *', async function(fireDate) {
//   try {
//     await connection();
//     return;
//   } catch (err) {
//     console.log(err);
//     return err;
//   }
// });

app.listen(PORT, function() {
  console.log(`Crawler on port: ${PORT}`);
});
