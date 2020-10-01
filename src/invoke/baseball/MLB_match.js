const momentUtil = require('../../helpers/momentUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { MLB_teamName2id } = require('../../helpers/teamsMapping');
const { MLB_statusMapping } = require('../../helpers/statusUtil');
const configs = require('../../configs/league/MLB_configs');
const { updateMatchChunk2MySQL } = require('../../helpers/databaseEngine');

async function main() {
  try {
    let { scheduleAPI, sportId, date, leagueId, hydrate, useLatestGames, league, league_id, sport_id, ori_league_id } = configs;
    date = momentUtil.timestamp2date(Date.now(), { format: 'YYYY-MM-DD' });
    const URL = `${scheduleAPI}?sportId=${sportId}&date=${date}&leagueId=${leagueId}&hydrate=${hydrate}&useLatestGames=${useLatestGames}`;
    const data = await getData(URL);
    const matchChunk = await repackageMatches(data);
    await updateMatchChunk2MySQL(matchChunk, { league, league_id, sport_id, ori_league_id });

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

async function repackageMatches(matchData) {
  try {
    const data = [];
    if (!matchData.dates.length) return Promise.resolve(data);
    matchData.dates[0].games.map(async function(ele) {
      const matchId = String(ele.gamePk);
      const homeId = MLB_teamName2id(ele.teams.home.team.teamCode).id;
      const awayId = MLB_teamName2id(ele.teams.away.team.teamCode).id;
      const homeAlias = ele.teams.home.team.abbreviation;
      const awayAlias = ele.teams.away.team.abbreviation;
      const { detailedStatus, codedGameState, abstractGameCode, statusCode } = ele.status;
      const status = MLB_statusMapping(matchId, { detailedStatus, codedGameState, abstractGameCode, statusCode });
      // const gameDate = gameDateProcessor(ele.gameDate);
      const scheduled = momentUtil.date2timestamp(ele.gameDate);
      if (ele.status.startTimeTBD === true) {
        const matchTBD = await repackageTBDMatches(matchData, { matchId, scheduled, homeId, homeAlias, awayId, awayAlias, status });
        data.push(matchTBD);
      }
      if (ele.status.startTimeTBD === undefined) {
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
module.exports = main;
