const configs = require('../../configs/league/NBA_configs');
const { timestamp2date } = require('../../helpers/momentUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { NBA_teamName2id } = require('../../helpers/teamsMapping');
const { updateMatchChunk2MySQL } = require('../../helpers/databaseEngine');
const { MATCH_STATUS } = require('../../helpers/leaguesUtil');

async function main() {
  try {
    let { matchAPI, gameDate, countryCode, days, locale, tz } = configs;
    gameDate = timestamp2date(Date.now(), { op: 'add', value: 0, unit: 'days', format: 'YYYY-MM-DD' });
    const URL = `${matchAPI}?gameDate=${gameDate}&countryCode=${countryCode}&days=${days}&locale=${locale}&tz=${tz}`;
    const data = await getData(URL);
    const matchChunk = await repackageMatches(data);
    await updateMatchChunk2MySQL(matchChunk, configs);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

async function repackageMatches(matchData) {
  try {
    const data = [];
    matchData.payload.dates[0].games.map(function(ele) {
      data.push({
        matchId: ele.profile.gameId,
        scheduled: parseInt(ele.profile.utcMillis),
        status: MATCH_STATUS.SCHEDULED,
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

module.exports = main;
