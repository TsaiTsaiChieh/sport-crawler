require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const NPB = {
  match: require('./src/crawler/baseball/NPB_match'),
  livescore: require('./src/crawler/baseball/NPB_livescore')
};
const CPBL = {
  match: require('./src/crawler/baseball/CPBL_match'),
  status: require('./src/invoke/baseball/CPBL_status'),
  livescore: require('./src/invoke/baseball/CPBL_livescore')
};
const { zone_tw } = process.env;
const { APP3_PORT } = process.env;

const app = express();
app.use(Have.haven());

schedule.scheduleJob('NPB 賽程', '0 */1 * * *', zone_tw, async function() {
  try {
    await NPB.match();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('NPB 即時比分', '*/5 * * * * *', zone_tw, async function() {
  try {
    await NPB.livescore();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('CPBL 賽程', '0 */1 * * *', zone_tw, async function() {
  try {
    await CPBL.match();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('CPBL 監聽賽事狀態', '0 */1 * * * *', zone_tw, async function() {
  try {
    await CPBL.status();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('CPBL 即時比分', '*/5 * * * * *', zone_tw, async function() {
  try {
    await CPBL.livescore();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

app.listen(APP3_PORT, function() {
  console.log(`NPB & CPBL Crawler on port: ${APP3_PORT}`);
});
