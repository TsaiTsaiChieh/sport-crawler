const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');
const league = 'NBA';

/**
 * * matchAPI example:
 * * https://tw.global.nba.com/stats2/season/schedule.json?gameDate=2020-09-24&countryCode=TW&days=1&locale=zh_TW&tz=%2B8
 * * liveAPI example:
 * * https://tw.global.nba.com/stats2/game/playbyplay.json?gameId=0041900313&locale=zh_TW
 * * teamComparisonAPI example:
 * * https://tw.global.nba.com/stats2/game/snapshot.json?countryCode=TW&gameId=0041900313
*/

const configs = {
  league,
  sport: league2Sport(league).sport,
  matchAPI: 'https://tw.global.nba.com/stats2/season/schedule.json',
  liveAPI: 'https://tw.global.nba.com/stats2/game/playbyplay.json',
  teamComparisonAPI: 'https://tw.global.nba.com/stats2/game/snapshot.json',
  gameDate: '',
  countryCode: process.env.countryCode,
  days: 1,
  locale: process.env.locale,
  tz: `%2B${process.env.GMT}`,
  league_id: leagueCodebook(league).id,
  sport_id: league2Sport(league).sport_id,
  ori_league_id: leagueCodebook(league).ori_league_id
};

module.exports = configs;
