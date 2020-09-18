const moment = require('moment');
require('moment-timezone');
const { zone_tw } = process.env;

function timestampFormat(timestamp, format = 'YYYY-MM-DD') {
  const today = moment.tz(timestamp, zone_tw).format(format);
  return today;
}
/**
 * * date2unix
 * @pInput { String } date 日期 ex: '2020-07-01' or '20200701'
 * @pInput { Object } operation 運算物件 (optional) ex: { op: 'add', value: 1, unit: 'days'}
 * @pInput { String } 時區 (optional) ex: 'America/Los_Angeles' or 'Asia/Taipei' (default)
 * @pOutput { Integer } Unix time
 */
function date2unix(date, operation, zone = zone_tw) {
  if (operation) {
    if (operation.op === 'add') return moment.tz(date, zone).add(operation.value, operation.unit).unix();
    if (operation.op === 'subtract') return moment.tz(date, zone).subtract(operation.value, operation.unit).unix();
    else throw new Error('Invalid parameter');
  }
  return moment.tz(date, zone).unix();
};

function date2timestamp(date, operation, zone = zone_tw) {
  if (operation) {
    if (operation.op === 'add') return moment.tz(date, zone).add(operation.value, operation.unit).valueOf();
    if (operation.op === 'subtract') return moment.tz(date, zone).subtract(operation.value, operation.unit).valueOf();
    else throw new Error('Invalid parameter');
  }
  return moment.tz(date, zone).valueOf();
};
/**
 * * timestamp2date
 * @pInput { Integer } timestamp 時間戳記 ex: new Date()
 * @pInput { Object } operation 運算物件 (optional) ex: { op: 'add', value: 1, unit: 'days', format: 'YYYY-MM-DD'}
 * @pInput { String } 時區 (optional) ex: 'America/Los_Angeles' or 'Asia/Taipei' (default)
 * @pOutput { String } 日期字串
 */
function timestamp2date(timestamp, operation, zone = zone_tw) {
  const datetime = moment.tz(timestamp, zone);
  if (!operation) return datetime.format('YYYYMMDD');
  /* 處理時間計算 */
  if (operation.op === 'add') datetime.add(operation.value, operation.unit);
  else if (operation.op === 'subtract') datetime.subtract(operation.value, operation.unit);
  else if (operation.op) throw new Error('Invalid parameter');
  /* 處理時間格式 */
  if (operation.format) return datetime.format(operation.format);
  else return datetime.format('YYYYMMDD');
}

function taipeiDate(timestamp, format = 'YYYY-MM-DD HH:mm:ss ZZ') {
  const today = moment.tz(timestamp, zone_tw).format(format);
  return today;
}

module.exports = {
  timestampFormat,
  date2unix,
  date2timestamp,
  timestamp2date,
  taipeiDate
};
