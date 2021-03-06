const configs = require('../../configs/league/MLB_configs');
const momentUtil = require('../../helpers/momentUtil');
const { getScheduledAndInplayMatchesFromMySQL } = require('../../helpers/databaseEngine');
const ServerErrors = require('../../helpers/ServerErrors');
const { getData } = require('../../helpers/invokeUtil');
const { MLB_statusMapping, MATCH_STATUS } = require('../../helpers/statusUtil');
const mysql = require('../../helpers/mysqlUtil');
const { set2realtime } = require('../../helpers/firebaseUtil');

async function main() {
  try {
    const { league_id } = configs;
    const nowUnix = Math.floor(Date.now() / 1000);
    const matchData = await getScheduledAndInplayMatchesFromMySQL(nowUnix, league_id);
    if (matchData.length) await invokeAPI(matchData);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

async function invokeAPI(matchData) {
  try {
    let { scheduleAPI, sportId, date, leagueId, hydrate, useLatestGames } = configs;
    // 需打今天跟明天 MLB API
    [-1, 0].map(async function(i) {
      date = momentUtil.timestamp2date(Date.now(), { op: 'add', value: i, unit: 'days', format: 'YYYY-MM-DD' });
      const URL = `${scheduleAPI}?sportId=${sportId}&date=${date}&leagueId=${leagueId}&hydrate=${hydrate}&useLatestGames=${useLatestGames}`;
      const gameData = await getData(URL);
      const matchChunk = await repackageMatchData(matchData, gameData);
      await updateStatusOrScore2MySQL(matchChunk, matchData);
    });

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

function repackageMatchData(matchData, gameData) {
  try {
    const data = [];
    if (!gameData.dates.length) return Promise.resolve(data);

    gameData.dates[0].games.map(function(ele) {
      const matchId = String(ele.gamePk);
      const { detailedState, codedGameState, abstractGameCode, statusCode } = ele.status;
      const status = checkMatchStatus(matchData, matchId, { detailedState, codedGameState, abstractGameCode, statusCode });
      let homeScore = 0;
      let awayScore = 0;
      if (ele.teams.home.score) homeScore = ele.teams.home.score;
      if (ele.teams.away.score) awayScore = ele.teams.away.score;
      data.push({
        matchId,
        status,
        homeScore,
        awayScore
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

function checkMatchStatus(matchData, matchId, statusObj) {
  const { detailedState, codedGameState, abstractGameCode, statusCode } = statusObj;
  let status = MLB_statusMapping(matchId, { detailedState, codedGameState, abstractGameCode, statusCode });
  matchData.map(function(match) {
    // now > 開賽時間且 API 偵測未開打
    const now = Date.now() + 60 * 1000;
    if (match.matchId === matchId && (now >= match.scheduled * 1000 && match.status === MATCH_STATUS.SCHEDULED)) status = MATCH_STATUS.INPLAY;
  });
  return status;
}

async function updateStatusOrScore2MySQL(games, matches) {
  try {
    const { INPLAY, END, TBD, POSTPONED } = MATCH_STATUS;
    const { league, sport } = configs;
    const path = `${sport}/${league}`;

    games.map(function(game) {
      matches.map(async function(match) {
        const now = momentUtil.taipeiDate(new Date());
        const { matchId } = game;
        if (game.matchId === match.matchId && game.status === END && match.status !== END) {
          await set2realtime(`${path}/${matchId}/Summary/status`, END);
          await mysql.Match.update({ status: game.status, home_points: game.homeScore, away_points: game.awayScore }, { where: { bets_id: matchId } });
          console.log(`MLB - ${matchId} 完賽 at ${now}`);
        }
        if (game.matchId === match.matchId && game.status === INPLAY && match.status !== INPLAY) {
          await set2realtime(`${path}/${matchId}/Summary/status`, INPLAY);
          await mysql.Match.update({ status: game.status }, { where: { bets_id: matchId } });
          console.log(`MLB - ${matchId} 開賽 at ${now}`);
        }
        if ((game.matchId === match.matchId && game.status === POSTPONED && match.status !== POSTPONED) ||
         (game.matchId === match.matchId && game.status === TBD && match.status !== TBD)) {
          await set2realtime(`${path}/${matchId}/Summary/status`, POSTPONED);
          await mysql.Match.update({ status: game.status }, { where: { bets_id: matchId } });
          console.log(`MLB - ${matchId} 延期 at ${now}`);
        }
      });
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}
module.exports = main;
