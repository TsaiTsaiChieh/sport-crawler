const axios = require('axios');
const cheerio = require('cheerio');
const ServerErrors = require('./ServerErrors');

async function getData(URL) {
  try {
    const { data } = await axios(URL);
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.AxiosGetMethodError(err.stack));
  }
}

async function crawler(URL) {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data); // load in the HTML
    return Promise.resolve($);
  } catch (err) {
    return Promise.reject(new ServerErrors.AxiosGetMethodError(err.stack));
  }
}

module.exports = {
  getData,
  crawler
};
