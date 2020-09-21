const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');
const league = 'NBA';
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
