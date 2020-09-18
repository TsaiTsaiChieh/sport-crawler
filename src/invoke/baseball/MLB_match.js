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

module.exports = main;
