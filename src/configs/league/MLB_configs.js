const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');
const league = 'MLB';
const configs = {
  league,
  scheduleAPI: 'https://statsapi.mlb.com/api/v1/schedule',
  sportId: 1,
  date: '',
  leagueId: '103,104',
  hydrate: 'team,linescore,flags,liveLookin,review',
  useLatestGames: false,
  league_id: leagueCodebook(league).id,
  sport_id: league2Sport(league).sport_id,
  ori_league_id: leagueCodebook(league).ori_league_id
};

module.exports = configs;
