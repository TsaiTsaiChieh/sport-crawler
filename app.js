require('dotenv').config();
const express = require('express');
const Have = require('domain-haven');
const { PORT } = process.env;
// const connection = require('./src/helpers/connection');

const app = express();

app.use(Have.haven());

app.get('/NBA/livescore', require('./src/routes/NBA_livescore'));

app.listen(PORT, function() {
  console.log(`Crawler on port: ${PORT}`);
});
