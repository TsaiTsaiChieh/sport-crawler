require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const schedule = require('node-schedule-tz');
const envValues = require('./src/configs/envValues');
const { APP4_PORT } = process.env;
const connection = require('./src/helpers/connection');

const app = express();
app.use(Have.haven());

schedule.scheduleJob('*/10 * * * * *', async function() {
  try {
    await connection();
    console.log(`firebaseConfig: ${JSON.stringify(envValues.firebaseConfig)}`);
    console.log(`cert: ${envValues.cert}`);
    console.log(`hwAccount: ${JSON.stringify(envValues.hwAccount)}`);
    console.log(`MySQL host: ${envValues.MySQL_host}`);
    return;
  } catch (err) {
    console.log(err);
    return err;
  }
});

app.listen(APP4_PORT, function() {
  console.log(`Test parameter on port: ${APP4_PORT}`);
});
