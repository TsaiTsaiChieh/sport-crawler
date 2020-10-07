require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const BJL = {
  match: require('./src/crawler/basketball/BJL_match')
};
const { zone_tw } = process.env;
const { APP5_PORT } = process.env;

const app = express();
app.use(Have.haven());

schedule.scheduleJob('BJL 賽程', '*/5 * * * * *', zone_tw, async function() {
  try {
    await BJL.match();
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

app.listen(APP5_PORT, function() {
  console.log(`BJL & KBL Crawler on port: ${APP5_PORT}`);
});
