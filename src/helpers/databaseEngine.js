const { Sequelize } = require('sequelize');
const { Op } = Sequelize;
const mysql = require('./mysqlUtil');
const { MATCH_STATUS } = require('./statusUtil');

async function getScheduledAndInplayMatchesFromMySQL(nowUnix, leagueId) {
  try {
    // Index is range, taking about 170ms
    const result = await mysql.Match.findAll({
      attributes: [['bets_id', 'matchId'], 'status'],
      where: {
        league_id: leagueId,
        status: { [Op.or]: [MATCH_STATUS.SCHEDULED, MATCH_STATUS.INPLAY] },
        scheduled: { [Op.lte]: nowUnix }
      },
      raw: true
    });
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

module.exports = {
  getScheduledAndInplayMatchesFromMySQL
};
