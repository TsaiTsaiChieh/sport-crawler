
const configs = {
  matchAPI: 'https://tw.global.nba.com/stats2/scores/gamedaystatus.json?gameDate=2020-09-09&locale=zh_TW&tz=%2B8',
  gameDate: '',
  locale: process.env.locale,
  tz: `%2B${process.env.GMT}`
};
console.log(configs);
