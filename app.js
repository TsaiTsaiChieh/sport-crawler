require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule');
// const NBA_prematch = require('./src/invoke/baseball/NBA_match');
// const connection = require('./src/helpers/connection');
// const mysql = require('./src/helpers/mysqlUtil');

const app = express();

app.use(Have.haven());

schedule.scheduleJob('*/3 * * * * *', async function() {
  try {
    // console.log('Each 3 second...');
    // await NBA_prematch();
  } catch (err) {
    console.log(err);
  }

  // await connection();
});

const { PORT } = process.env;
app.listen(PORT, function() {
  console.log(`Crawler on port: ${PORT}`);
});
