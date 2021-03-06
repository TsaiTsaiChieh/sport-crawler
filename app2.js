require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
// const NBA = {
//   match: require('./src/invoke/basketball/NBA_match'),
//   livescore: require('./src/invoke/basketball/NBA_livescore')
// };

const KBO = {
  match: require('./src/invoke/baseball/KBO_match'),
  status: require('./src/invoke/baseball/KBO_status'),
  livescore: require('./src/invoke/baseball/KBO_livescore')
};

const { zone_tw } = process.env;
const { APP2_PORT } = process.env;

const app = express();
app.use(Have.haven());

// schedule.scheduleJob('NBA 賽程', '5 */1 * * *', zone_tw, async function() {
//   try {
//     await NBA.match();
//     return;
//   } catch (err) {
//     console.log(err);
//     return err;
//   }
// });

// schedule.scheduleJob('NBA 文字直播', '*/5 * * * * *', zone_tw, async function() {
//   try {
//     await NBA.livescore();
//     return;
//   } catch (err) {
//     console.log(err);
//     return err;
//   }
// });

schedule.scheduleJob('KBO 文字直播', '*/5 * * * * *', zone_tw, async function() {
  try {
    await KBO.livescore();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('KBO 賽程', '5 */1 * * *', zone_tw, async function() {
  try {
    await KBO.match();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('KBO 監聽賽事狀態', '0 */1 * * * *', zone_tw, async function() {
  try {
    await KBO.status();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

app.listen(APP2_PORT, function() {
  // console.log(`NBA & KBO crawler on port: ${APP2_PORT}`);
  console.log(`KBO crawler on port: ${APP2_PORT}`);
});
