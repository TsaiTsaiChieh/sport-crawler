require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule');
const HW = require('./src/handicap/HW/HW_handicap');
// const connection = require('./src/helpers/connection');
const app = express();

app.use(Have.haven());

schedule.scheduleJob('0 0 11 * * *', async function() {
  // 取得 Token
  // HW.getToken();
});

schedule.scheduleJob('*/3 * * * * *', async function() {
  // 取得盤口
  HW.getHandicap();
});

schedule.scheduleJob('*/3 * * * * *', async function() {
  // 其他測試
  // HW.test();
});

const { PORT } = process.env;
app.listen(PORT, function() {
  console.log(`Crawler on port: ${PORT}`);
});
