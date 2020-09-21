require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const NBA_match = require('./src/invoke/basketball/NBA_match');
const NBA_livescore = require('./src/invoke/basketball/NBA_livescore');
const MLB_match = require('./src/invoke/baseball/MLB_match');
const MLB_status = require('./src/invoke/baseball/MLB_status');
const CPBL_match = require('./src/invoke/baseball/CPBL_match');
const KBO_match = require('./src/crawler/baseball/KBO_match');
const KBO_status = require('./src/crawler/baseball/KBO_status');
const { zone_tw } = process.env;
const { PORT } = process.env;
// const connection = require('./src/helpers/connection');

const app = express();

app.use(Have.haven());

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
    await CPBL_match();
    await KBO_match();
    return;
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
