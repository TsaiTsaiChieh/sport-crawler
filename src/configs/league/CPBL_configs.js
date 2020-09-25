const league = 'CPBL';
const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');

/**
 * * livescoreURL example: (全球即時比分網)
 * * https://web2.sa8888.net/sport/Games.aspx?lang=3&device=pc&ball=tw
*/

const configs = {
  league,
  livescoreURL: 'https://web2.sa8888.net/sport/Games.aspx',
  // livescoreURL
  lang: 3, // 1 is tw, 3 is english
  ball: 'tw', // 台棒
  sport: league2Sport(league).sport,
  league_id: leagueCodebook(league).id,
  sport_id: league2Sport(league).sport_id,
  ori_league_id: leagueCodebook(league).ori_league_id
};

module.exports = configs;
