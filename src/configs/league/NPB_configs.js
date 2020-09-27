const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');

/**
 * * livescoreURL example: (獵分網)
 * * https://score.com.tw/dbjson.php?date=2020-09-25&sporttype=bb&union=bb_2
*/

const league = 'NPB';
const configs = {
  league,
  livescoreURL: 'https://score.com.tw/dbjson.php',
  // livescoreURL
  date: '',
  sporttype: 'bb',
  union: 'bb_2', // 日棒,
  sport: league2Sport(league).sport,
  league_id: leagueCodebook(league).id,
  sport_id: league2Sport(league).sport_id,
  ori_league_id: leagueCodebook(league).ori_league_id
};

module.exports = configs;
