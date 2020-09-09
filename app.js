require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule');
// const connection = require('./src/helpers/connection');
const app = express();

app.use(Have.haven());

schedule.scheduleJob('*/10 * * * * *', async function() {
  console.log('每十秒！！就會有好事發生');
  // await connection();
});

const { PORT } = process.env;
app.listen(PORT, function() {
  console.log(`Crawler on port: ${PORT}`);
});
