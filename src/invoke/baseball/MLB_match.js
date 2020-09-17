const momentUtil = require('../../helpers/momentUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { MLB_teamName2id } = require('../../helpers/teamsMapping');
const mysql = require('../../helpers/mysqlUtil');
const { MLB_statusMapping, MATCH_STATUS } = require('../../helpers/statusUtil');
const configs = require('../../configs/league/MLB_configs');

async function main() {
  try {
    let { scheduleAPI, sportId, date, leagueId, hydrate, useLatestGames } = configs;
    date = momentUtil.timestamp2date(Date.now(), { format: 'YYYY-MM-DD' });
    const URL = `${scheduleAPI}?sportId=${sportId}&date=${date}&leagueId=${leagueId}&hydrate=${hydrate}&useLatestGames=${useLatestGames}`;
    const data = await getData(URL);
    const matchChunk = await repackageMatches(data);
    await update2MySQL(matchChunk);

    return Promise.resolve();
  } catch (err) {
    return Promise.resolve(err);
  }
}

async function repackageMatches(matchData) {
  try {
    const data = [];
    matchData.dates[0].games.map(function(ele) {
      if (ele.status.startTimeTBD === undefined) {
        const matchId = String(ele.gamePk);
        const detailedStatus = ele.status.detailedStatus;
        const codedGameState = ele.status.codedGameState;
        const abstractGameCode = ele.status.abstractGameCode;
        data.push({
          matchId,
          scheduled: momentUtil.date2timestamp(ele.gameDate),
          homeId: MLB_teamName2id(ele.teams.home.team.teamCode).id,
          homeAlias: ele.teams.home.team.abbreviation,
          awayId: MLB_teamName2id(ele.teams.away.team.teamCode).id,
          awayAlias: ele.teams.away.team.abbreviation,
          status: MLB_statusMapping(matchId, { detailedStatus, codedGameState, abstractGameCode })
        });
      }
    });
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

async function update2MySQL(data) {
  try {
    const { league_id, sport_id, ori_league_id } = configs;

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
      console.log(`更新 MLB: ${ele.matchId} - ${ele.awayAlias}(${ele.awayId}) vs ${ele.homeAlias}(${ele.homeId}) 成功`);
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

module.exports = main;
