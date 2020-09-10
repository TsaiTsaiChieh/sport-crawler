const axios = require('axios');
const ServerErrors = require('./ServerErrors');

async function getData(URL) {
  try {
    const { data } = await axios(URL);
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.AxiosGetMethodError(err.stack));
  }
}

module.exports = {
  getData
};
