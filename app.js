require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const NBA_match = require('./src/invoke/baseball/NBA_match');
const NBA_livescore = require('./src/invoke/baseball/NBA_livescore');
const connection = require('./src/helpers/connection');
const { zone_tw } = process.env;
const { taipeiDate } = require('./src/helpers/momentUtil');
const app = express();

app.use(Have.haven());

schedule.scheduleJob('*/3 * * * * *', async function() {
  try {
    console.log(`NBA_livescore was supposed to run at ${taipeiDate(new Date())}`);
    await NBA_livescore();
  } catch (err) {
    console.log(err);
  }
});

// If a timezone is specified, a job name must be specified as well as the first parameter.
schedule.scheduleJob('Match information', '0 9 * * *', zone_tw, async function() {
  try {
    console.log(`NBA_match run at ${taipeiDate(new Date())}`);
    await NBA_match();
  } catch (err) {
    console.log(err);
  }
});

schedule.scheduleJob('0 */1 * * * *', async function() {
  try {
    await connection();
  } catch (err) {
    console.log(err);
  }
});

const { PORT } = process.env;
app.listen(PORT, function() {
  console.log(`Crawler on port: ${PORT}`);
});
