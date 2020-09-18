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
      const matchId = String(ele.gamePk);
      const detailedStatus = ele.status.detailedState; // 詳細描述
      const codedGameState = ele.status.codedGameState;
      const abstractGameCode = ele.status.abstractGameCode;
      data.push({
        matchId,
        status: MLB_statusMapping(matchId, { detailedStatus, codedGameState, abstractGameCode })
      });
      // startTimeTBD 為 true，可能開打中或未開打或結束或根本沒開始過
      // if (ele.status.startTimeTBD === true) data[i].scheduled = momentUtil.date2timestamp(ele.gameDate);
      // if (ele.status.startTimeTBD === true) data[i].status = MATCH_STATUS.TBD;
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
