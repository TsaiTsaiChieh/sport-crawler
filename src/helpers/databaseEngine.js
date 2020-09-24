const mysql = require('./mysqlUtil');
const ServerErrors = require('./ServerErrors');
const { MATCH_STATUS } = require('./statusUtil');

async function getScheduledAndInplayMatchesFromMySQL(nowUnix, leagueId) {
  try {
    const yesterday = nowUnix - 24 * 60 * 60;
    // Index is range, taking about 170ms
    const result = await mysql.sequelize.query(`
    SELECT game.bets_id AS matchId, game.status, game.scheduled, game.scheduled_tw, 
	         home.team_id AS homeId, home.alias AS homeAlias, 
	         away.team_id AS awayId, away.alias AS awayAlias
      FROM matches AS game
 LEFT JOIN match__teams AS home ON game.home_id = home.team_id
 LEFT JOIN match__teams AS away ON game.away_id = away.team_id
     WHERE game.league_id = :league_id
       AND (status = :SCHEDULED OR status = :INPLAY)
       AND (scheduled <= :nowUnix AND scheduled >= :yesterday)`, {
      replacements: {
        league_id: leagueId,
        SCHEDULED: MATCH_STATUS.SCHEDULED,
        INPLAY: MATCH_STATUS.INPLAY,
        nowUnix,
        yesterday
      },
      raw: true,
      type: mysql.sequelize.QueryTypes.SELECT
    });
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

async function updateMatchChunk2MySQL(data, configs) {
  try {
    const { league, league_id, sport_id, ori_league_id } = configs;
    data.map(async function(ele) {
      await mysql.Match.upsert({
        bets_id: ele.matchId,
        league_id: league_id,
        sport_id: sport_id,
        home_id: ele.homeId,
        away_id: ele.awayId,
        scheduled: ele.scheduled / 1000,
        scheduled_tw: ele.scheduled,
        flag_prematch: MATCH_STATUS.VALID,
        status: ele.status,
        ori_league_id: ori_league_id,
        ori_sport_id: sport_id
      });
      console.log(`更新 ${league}: ${ele.matchId} - ${ele.awayAlias}(${ele.awayId}) vs ${ele.homeAlias}(${ele.homeId}) 成功`);
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}
module.exports = {
  getScheduledAndInplayMatchesFromMySQL,
  updateMatchChunk2MySQL
};
