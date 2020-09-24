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
  livescore: require('./src/crawler/baseball/CPBL_livescore')
};
const { zone_tw } = process.env;
const { APP3_PORT } = process.env;

const app = express();
app.use(Have.haven());

schedule.scheduleJob('賽程', '0 */1 * * *', zone_tw, async function() {
  try {
    await NPB.match();
    await CPBL.match();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('即時比分', '*/5 * * * * *', zone_tw, async function() {
  try {
    await NPB.livescore();
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
