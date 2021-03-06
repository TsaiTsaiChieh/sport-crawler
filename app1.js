require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const MLB = {
  match: require('./src/invoke/baseball/MLB_match'),
  status: require('./src/invoke/baseball/MLB_status'),
  livescore: require('./src/invoke/baseball/MLB_livescore')
};
const { zone_tw } = process.env;
const { APP1_PORT } = process.env;

const app = express();
app.use(Have.haven());

schedule.scheduleJob('MLB 即時比分', '*/5 * * * * *', zone_tw, async function() {
  try {
    await MLB.livescore();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

schedule.scheduleJob('MLB 賽程', '5 */1 * * *', zone_tw, async function() {
  try {
    await MLB.match();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});
schedule.scheduleJob('MLB 監聽賽事狀態', '0 */1 * * * *', zone_tw, async function() {
  try {
    await MLB.status();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

app.listen(APP1_PORT, function() {
  console.log(`MLB crawler on port: ${APP1_PORT}`);
});
