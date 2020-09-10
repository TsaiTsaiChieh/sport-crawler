require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule');
const NBA_match = require('./src/invoke/baseball/NBA_match');
// const NBA_livescore = require('./src/invoke/baseball/NBA_livescore');
// const connection = require('./src/helpers/connection');
// const mysql = require('./src/helpers/mysqlUtil');

const app = express();

app.use(Have.haven());

schedule.scheduleJob('*/3 * * * * *', async function(fireDate) {
  try {
    // console.log(`This job was supposed to run at ${fireDate}`);
    // await NBA_livescore();
  } catch (err) {
    console.log(err);
  }
  // await connection();
});

schedule.scheduleJob('0 21 * * *', async function(fireDate) {
  try {
    console.log(`This job was supposed to run at ${fireDate} , but actually ran at ${new Date()}`);
    await NBA_match();
  } catch (err) {
    console.log(err);
  }

  // await connection();
});

const { PORT } = process.env;
app.listen(PORT, function() {
  console.log(`Crawler on port: ${PORT}`);
});
