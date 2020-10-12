const momentUtil = require('../../helpers/momentUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { MLB_teamName2id } = require('../../helpers/teamsMapping');
const { MATCH_STATUS, MLB_statusMapping } = require('../../helpers/statusUtil');
const configs = require('../../configs/league/MLB_configs');
const { getTomorrowScheduledMatchesFromMySQL, updateMatchChunk2MySQL, updateMatchChunk2Realtime } = require('../../helpers/databaseEngine');
const mysql = require('../../helpers/mysqlUtil');
const { set2realtime } = require('../../helpers/firebaseUtil');

async function main() {
  try {
    let { scheduleAPI, sportId, date, leagueId, hydrate, useLatestGames, league, league_id, sport_id, ori_league_id } = configs;
    date = momentUtil.timestamp2date(Date.now(), { format: 'YYYY-MM-DD' });
    const URL = `${scheduleAPI}?sportId=${sportId}&date=${date}&leagueId=${leagueId}&hydrate=${hydrate}&useLatestGames=${useLatestGames}`;
    const matchData = await getTomorrowScheduledMatchesFromMySQL(date, league_id);
    const gameData = await getData(URL);
    const matchChunk = await repackageMatches(gameData);
    await checkMatchesWhichAreCanceled(matchData, matchChunk);
    await updateMatchChunk2Realtime(matchChunk, configs);
    await updateMatchChunk2MySQL(matchChunk, { league, league_id, sport_id, ori_league_id });

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

async function repackageMatches(gameData) {
  try {
    const data = [];
    if (!gameData.dates.length) return Promise.resolve(data);
    gameData.dates[0].games.map(async function(game) {
      const matchId = String(game.gamePk);
      const homeId = MLB_teamName2id(game.teams.home.team.teamCode).id;
      const awayId = MLB_teamName2id(game.teams.away.team.teamCode).id;
      const homeAlias = game.teams.home.team.abbreviation;
      const awayAlias = game.teams.away.team.abbreviation;
      const { detailedStatus, codedGameState, abstractGameCode, statusCode } = game.status;
      const status = MLB_statusMapping(matchId, { detailedStatus, codedGameState, abstractGameCode, statusCode });
      // const gameDate = gameDateProcessor(game.gameDate);
      const scheduled = momentUtil.date2timestamp(game.gameDate);
      if (game.status.startTimeTBD === true) {
        const matchTBD = await repackageTBDMatches(gameData, { matchId, scheduled, homeId, homeAlias, awayId, awayAlias, status });
        data.push(matchTBD);
      }
      if (game.status.startTimeTBD === undefined) {
        data.push({ matchId, scheduled, homeId, homeAlias, awayId, awayAlias, status });
      }
    });
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

// function gameDateProcessor(gameDate) {
//   const reverseGameDate = gameDate.split('').reverse().join('');
//   const index = reverseGameDate.indexOf(':');
//   const gameDateDigit = parseInt(reverseGameDate.substr(index + 1, 1));
//   if (gameDateDigit !== 0 || gameDateDigit !== 5) {
//     const temp = reverseGameDate.substr(0, index + 1) + '0' + reverseGameDate.substring(index + 2);
//     gameDate = temp.split('').reverse().join('');
//   }
//   return gameDate;
// }

async function repackageTBDMatches(matchData, TBDData) {
  try {
    const { matchId, scheduled, homeId, homeAlias, awayId, awayAlias, status } = TBDData;
    let tmpScheduled = scheduled;
    matchData.dates[0].games.map(function(ele) {
      if (ele.status.startTimeTBD === undefined) {
        const tmpHomeId = MLB_teamName2id(ele.teams.home.team.teamCode).id;
        const tmpAwayId = MLB_teamName2id(ele.teams.away.team.teamCode).id;
        if ((tmpHomeId === homeId && tmpAwayId === awayId) || (tmpHomeId === awayId && tmpAwayId === homeId)) { // 一日雙重賽固定直接加三個小時
          tmpScheduled = momentUtil.date2timestamp(ele.gameDate, { op: 'add', value: 3, unit: 'hours' });
        }
      }
    });
    return Promise.resolve({ matchId, scheduled: tmpScheduled, homeId, homeAlias, awayId, awayAlias, status });
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

async function checkMatchesWhichAreCanceled(matchData, matchChunk) {
  if (!matchData.length) return Promise.resolve();
  const matchIdArr = []; // MySQL
  const gameIdArr = []; // API
  const matchesWhichAreCanceled = [];

  matchData.map(match => matchIdArr.push(match.matchId));
  matchChunk.map(game => gameIdArr.push(game.matchId));

  matchIdArr.map(function(matchId) {
    if (!gameIdArr.includes(matchId)) matchesWhichAreCanceled.push(matchId);
  });

  try {
    if (matchesWhichAreCanceled.length) {
      const { league, sport } = configs;
      const path = `${sport}/${league}`;

      matchesWhichAreCanceled.map(async function(matchId) {
        await mysql.Match.update({ status: MATCH_STATUS.CANCELLED }, { where: { bets_id: matchId } });
        await set2realtime(`${path}/${matchId}/Summary/status`, MATCH_STATUS.CANCELLED);
      });
    }
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
  return Promise.resolve();
}
module.exports = main;
