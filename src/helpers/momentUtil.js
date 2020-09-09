const moment = require('moment');
require('moment-timezone');
const { zone_tw } = process.env;
/**
* @param
*/

// 輸入的時間為該時區 ，輸出轉為 GMT 時間
/*
  date: 2020-07-01 or 20200701
  [operation]: {
        op: 'add',
        value: 1,
        unit: 'days'
      }
  zone: 'America/Los_Angeles' or 'Asia/Taipei'
*/
function convertTimezone(date, operation, zone = zone_tw) {
  if (operation) {
    if (operation.op === 'add') {
      return moment.tz(date, zone).add(operation.value, operation.unit).unix();
    }
    if (operation.op === 'subtract') {
      return moment
        .tz(date, zone)
        .subtract(operation.value, operation.unit)
        .unix();
    }
  }
  return moment.tz(date, zone).unix();
};

module.exports = {
  convertTimezone
};
