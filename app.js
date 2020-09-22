require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');

const NBA = {
  match: require('./src/invoke/basketball/NBA_match'),
  livescore: require('./src/invoke/basketball/NBA_livescore')
};
const MLB = {
  match: require('./src/invoke/baseball/MLB_match'),
  status: require('./src/invoke/baseball/MLB_status'),
  livescore: require('./src/invoke/baseball/MLB_livescore')
};
const KBO = {
  match: require('./src/crawler/baseball/KBO_match'),
  status: require('./src/crawler/baseball/KBO_status')
};
const CPBL = {
  match: require('./src/invoke/baseball/CPBL_match')
};
const { zone_tw } = process.env;
const { PORT } = process.env;
// const connection = require('./src/helpers/connection');

const app = express();

app.use(Have.haven());

schedule.scheduleJob('文字直播', '*/3 * * * * *', zone_tw, async function() {
  try {
    await NBA.livescore();
    await MLB.livescore();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('賽程', '0 */1 * * *', zone_tw, async function() {
  try {
    await CPBL.match();
    await NBA.match();
    await MLB.match();
    await KBO.match();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});
schedule.scheduleJob('監聽賽事狀態', '0 */1 * * * *', zone_tw, async function() {
  try {
    await MLB.status();
    await KBO.status();
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
