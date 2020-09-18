const league = 'KBO';
const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');
const configs = {
  league,
  matchURL: 'https://mykbostats.com/api/v2/games/game-day-block/',
  date: '',
  league_id: leagueCodebook(league).id,
  sport_id: league2Sport(league).sport_id,
  ori_league_id: leagueCodebook(league).ori_league_id
};

module.exports = configs;
