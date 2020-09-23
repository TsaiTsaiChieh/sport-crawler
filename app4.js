require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const { zone_tw } = process.env;
const { APP3_PORT } = process.env;

const app = express();
app.use(Have.haven());

schedule.scheduleJob('文字直播', '*/3 * * * * *', zone_tw, async function() {
  try {
    console.log(process.env);
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

app.listen(APP3_PORT, function() {
  console.log(`KBO & MLB crawler on port: ${APP3_PORT}`);
});
