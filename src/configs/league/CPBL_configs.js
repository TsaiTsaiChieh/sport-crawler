const league = 'CPBL';
const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');
const configs = {
  league,
  sport: league2Sport(league).sport,
  league_id: leagueCodebook(league).id,
  sport_id: league2Sport(league).sport_id,
  ori_league_id: leagueCodebook(league).ori_league_id
};

module.exports = configs;
