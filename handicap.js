require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const HW = require('./src/handicap/HW/HW_handicap');
const { zone_tw } = process.env;
const handicapApp = express();
const { HANDICAP_PORT } = process.env;
// const connection = require('./src/helpers/connection');

handicapApp.use(Have.haven());

schedule.scheduleJob('取得盤口', '*/30 * * * *', zone_tw, async function() {
  try {
    await HW.getHandicap();
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

handicapApp.listen(HANDICAP_PORT, function() {
  console.log(`Handicap on port: ${HANDICAP_PORT}`);
});
