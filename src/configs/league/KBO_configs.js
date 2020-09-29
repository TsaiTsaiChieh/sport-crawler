const league = 'KBO';
const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');

/**
 * * matchURL example:
 * * https://mykbostats.com/api/v2/games/game-day-block/2020-09-17
 * * livescoreURL example:
 * * statusAPL example:
 * * https://score.com.tw/dbjson.php?date=20200927&sporttype=bb&union=bb_10
 * * https://m.sports.naver.com/ajax/baseball/gamecenter/kbo/todayGames.nhn?gameId=20200923KTLT02020
 * * baseURL example:
 * * https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList?leId=1&srId=0&date=20200922
 * * livescoreURL example:（獵分網）
 * * https://score.com.tw/dbjson.php?date=2020-09-28&sporttype=bb&union=bb_10
 *
*/

const configs = {
  league,
  sport: league2Sport(league).sport,
  matchURL: 'https://mykbostats.com/api/v2/games/game-day-block/',
  statusAPI: 'https://score.com.tw/dbjson.php',
  livescoreURL: 'https://m.sports.naver.com/ajax/baseball/gamecenter/kbo/todayGames.nhn',
  baseURL: 'https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList',
  date: '',
  leId: 1,
  srId: 0,
  sporttype: 'bb',
  union: 'bb_10',
  gameId: '',
  nullThreshold: 200,
  league_id: leagueCodebook(league).id,
  sport_id: league2Sport(league).sport_id,
  ori_league_id: leagueCodebook(league).ori_league_id,
  KoreaZone: 'Asia/Seoul'
};

module.exports = configs;
