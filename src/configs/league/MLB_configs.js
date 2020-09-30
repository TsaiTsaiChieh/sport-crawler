const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');
const league = 'MLB';

/**
 * * scheduleAPI example:
 * * https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2020-09-23&leagueId=103,104&hydrate=team,linescore,flags,liveLookin,review&useLatestGames=false&language=en
 * * scoreBoardAPI example:
 * * https://bdfed.stitch.mlbinfra.com/bdfed/transform-mlb-scoreboard?stitch_env=prod&sportId=1&startDate=2020-09-23&endDate=2020-09-23
*/

const configs = {
  league,
  scheduleAPI: 'https://statsapi.mlb.com/api/v1/schedule',
  scoreBoardAPI: 'https://bdfed.stitch.mlbinfra.com/bdfed/transform-mlb-scoreboard',
  sport: league2Sport(league).sport,
  sportId: 1,
  date: '',
  leagueId: '103,104',
  hydrate: 'team,linescore,flags,liveLookin,review',
  useLatestGames: false,
  // scoreBoardAPI
  stitch_env: 'prod',
  startDate: '',
  endDate: '',
  gameTypes: ['E', 'S', 'R', 'D', 'L', 'W', 'A'],
  league_id: leagueCodebook(league).id,
  sport_id: league2Sport(league).sport_id,
  ori_league_id: leagueCodebook(league).ori_league_id
};

module.exports = configs;
