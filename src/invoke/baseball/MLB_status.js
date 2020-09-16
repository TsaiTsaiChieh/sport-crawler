const configs = require('../../configs/league/MLB_configs');
const momentUtil = require('../../helpers/momentUtil');
const { getScheduledAndInplayMatchesFromMySQL } = require('../../helpers/databaseEngine');
const ServerErrors = require('../../helpers/ServerErrors');
const { getData } = require('../../helpers/invokeUtil');
const { MLB_statusMapping, MATCH_STATUS } = require('../../helpers/statusUtil');
const mysql = require('../../helpers/mysqlUtil');

async function main() {
  try {
    const { league_id } = configs;
    const nowUnix = Math.floor(Date.now() / 1000);
    const matchData = await getScheduledAndInplayMatchesFromMySQL(nowUnix, league_id);
    if (matchData.length) await invokeAPI(matchData);
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

async function invokeAPI(matchData) {
  try {
    let { scheduleAPI, sportId, date, leagueId, hydrate, useLatestGames } = configs;
    // 需打今天跟明天 MLB API
    [0, 1].map(async function(i) {
      date = momentUtil.timestamp2date(Date.now(), { op: 'subtract', value: i, unit: 'days', format: 'YYYY-MM-DD' });
      const URL = `${scheduleAPI}?sportId=${sportId}&date=${date}&leagueId=${leagueId}&hydrate=${hydrate}&useLatestGames=${useLatestGames}`;
      const data = await getData(URL);
      const matchChunk = await repackageMatchData(data);
      await updateStatus2MySQL(matchChunk, matchData);
    });

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

function repackageMatchData(matchData) {
  try {
    const data = [];
    matchData.dates[0].games.map(function(ele, i) {
      const status = ele.status.codedGameState;
      data.push({
        matchId: String(ele.gamePk),
        status: MLB_statusMapping(status)
      });
      if (ele.status.startTimeTBD === true) data[i].status = MATCH_STATUS.TBD;
    });

    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

async function updateStatus2MySQL(games, matches) {
  try {
    const { INPLAY, END, TBD } = MATCH_STATUS;
    games.map(function(game) {
      matches.map(async function(match) {
        if ((game.matchId === match.matchId && game.status === INPLAY) ||
         (game.matchId === match.matchId && game.status === END) ||
         (game.matchId === match.matchId && game.status === TBD)) await mysql.Match.update({ status: game.status }, { where: { bets_id: game.matchId } });
      });
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}
module.exports = main;
