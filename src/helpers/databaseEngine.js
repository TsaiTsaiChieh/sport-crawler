const { Sequelize } = require('sequelize');
const { Op } = Sequelize;
const mysql = require('./mysqlUtil');
const ServerErrors = require('./ServerErrors');
const { MATCH_STATUS } = require('./statusUtil');

async function getScheduledAndInplayMatchesFromMySQL(nowUnix, leagueId) {
  try {
    const yesterday = nowUnix - 24 * 60 * 60;
    // Index is range, taking about 170ms
    const result = await mysql.Match.findAll({
      attributes: [['bets_id', 'matchId'], 'status'],
      where: {
        league_id: leagueId,
        status: { [Op.or]: [MATCH_STATUS.SCHEDULED, MATCH_STATUS.INPLAY] },
        scheduled: {
          [Op.lte]: nowUnix,
          [Op.gte]: yesterday
        }
      },
      raw: true
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
