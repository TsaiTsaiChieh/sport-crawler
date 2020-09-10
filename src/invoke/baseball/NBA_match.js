const momentUtil = require('../../helpers/momentUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { NBA_teamName2id } = require('../../helpers/teamsMapping');
const mysql = require('../../helpers/mysqlUtil');
const { MATCH_STATUS, league2Sport, leagueCodebook } = require('../../helpers/leaguesUtil');

const configs = {
  league: 'NBA',
  API: 'https://tw.global.nba.com/stats2/season/schedule.json',
  gameDate: '',
  countryCode: process.env.countryCode,
  days: 1,
  locale: process.env.locale,
  tz: `%2B${process.env.GMT}`
};

async function main() {
  try {
    let { API, gameDate, countryCode, days, locale, tz } = configs;
    gameDate = momentUtil.timestamp2date(Date.now(), { op: 'add', value: 1, unit: 'days', format: 'YYYY-MM-DD' });
    const URL = `${API}?gameDate=${gameDate}&countryCode=${countryCode}&days=${days}&locale=${locale}&tz=${tz}`;
    const data = await getData(URL);
    const matchChunk = await repackageMatches(data);
    await update2MySQL(matchChunk);
  } catch (err) {
    return err;
  }
}

async function repackageMatches(matchData) {
  try {
    const data = [];
    matchData.payload.dates[0].games.map(function(ele) {
      data.push({
        matchId: ele.profile.gameId,
        scheduled: parseInt(ele.profile.utcMillis),
        homeId: NBA_teamName2id(ele.homeTeam.profile.abbr),
        homeAlias: ele.homeTeam.profile.abbr,
        homeAliasCh: ele.homeTeam.profile.displayAbbr,
        awayId: NBA_teamName2id(ele.awayTeam.profile.abbr),
        awayAlias: ele.awayTeam.profile.abbr,
        awayAliasCh: ele.awayTeam.profile.displayAbbr
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
        status: MATCH_STATUS.SCHEDULED,
        ori_league_id: leagueId,
        ori_sport_id: sportId
      });
      console.log(`更新 NBA: ${ele.matchId} - ${ele.awayAliasCh}(${ele.awayId}) vs ${ele.homeAliasCh}(${ele.homeId}) 成功`);
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

module.exports = main;
