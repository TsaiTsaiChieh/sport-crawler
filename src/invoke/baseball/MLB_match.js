const momentUtil = require('../../helpers/momentUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { MLB_teamName2id } = require('../../helpers/teamsMapping');
const { league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');
const mysql = require('../../helpers/mysqlUtil');
const { MLB_statusMapping, MATCH_STATUS } = require('../../helpers/statusUtil');

const configs = {
  league: 'MLB',
  API: 'https://statsapi.mlb.com/api/v1/schedule',
  sportId: 1,
  date: '',
  leagueId: '103,104',
  hydrate: 'team,linescore,flags,liveLookin,review',
  useLatestGames: false
};

async function main() {
  try {
    let { API, sportId, date, leagueId, hydrate, useLatestGames } = configs;
    date = momentUtil.timestamp2date(Date.now(), { format: 'YYYY-MM-DD' });
    const URL = `${API}?sportId=${sportId}&date=${date}&leagueId=${leagueId}&hydrate=${hydrate}&useLatestGames=${useLatestGames}`;
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
      data.push({
        matchId: ele.gamePk,
        scheduled: momentUtil.date2timestamp(ele.gameDate),
        homeId: MLB_teamName2id(ele.teams.home.team.teamCode).id,
        homeAlias: ele.teams.home.team.abbreviation,
        awayId: MLB_teamName2id(ele.teams.away.team.teamCode).id,
        awayAlias: ele.teams.away.team.abbreviation,
        status: ele.status.codedGameState
      });
    });
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

async function update2MySQL(data) {
  try {
    const leagueId = leagueCodebook(configs.league).id;
    const oriLeagueId = leagueCodebook(configs.league).ori_id;
    const sportId = league2Sport(configs.league).sport_id;
    data.map(async function(ele) {
      await mysql.Match.upsert({
        bets_id: ele.matchId,
        league_id: leagueId,
        sport_id: sportId,
        home_id: ele.homeId,
        away_id: ele.awayId,
        scheduled: ele.scheduled / 1000,
        scheduled_tw: ele.scheduled,
        flag_prematch: MATCH_STATUS.VALID,
        status: MLB_statusMapping(ele.status),
        ori_league_id: oriLeagueId,
        ori_sport_id: sportId
      });
      console.log(`更新 MLB: ${ele.matchId} - ${ele.awayAlias}(${ele.awayId}) vs ${ele.homeAlias}(${ele.homeId}) 成功`);
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

module.exports = main;
