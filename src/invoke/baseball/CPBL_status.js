const configs = require('../../configs/league/CPBL_configs');
const momentUtil = require('../../helpers/momentUtil');
const { getScheduledAndInplayMatchesFromMySQL } = require('../../helpers/databaseEngine');
const moment = require('moment');
require('moment-timezone');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { CPBL_teamName2id } = require('../../helpers/teamsMapping');
const { MATCH_STATUS, CPBL_statusMapping } = require('../../helpers/statusUtil');
const mysql = require('../../helpers/mysqlUtil');

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
};

async function invokeAPI(matchData) {
  try {
    let { livescoreURL, date, sporttype, union } = configs;
    date = momentUtil.timestamp2date(Date.now(), { format: 'YYYY-MM-DD' });
    const URL = `${livescoreURL}?date=${date}&sporttype=${sporttype}&union=${union}`;
    const data = await getData(URL);
    const matchChunk = await repackageMatchData(date, data, matchData);
    await updateStatusOrScore2MySQL(matchChunk);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

function repackageMatchData(date, gameData, matchData) {
  try {
    const data = [];
    gameData.data.map(function(game) {
      const homeId = CPBL_teamName2id(game.home);
      const awayId = CPBL_teamName2id(game.away);
      const time = game.runtime;
      const scheduled = moment.tz(`${date} ${time}`, 'YYYY-MM-DD hh:mm', configs.taiwanZone).unix();
      matchData.map(function(match) {
        if (homeId === match.homeId && awayId === match.awayId && scheduled === match.scheduled) {
          data.push({
            matchId: match.matchId,
            status: CPBL_statusMapping(game.gameid, game.status),
            homeScore: game.score_a,
            awayScore: game.score_b
          });
        }
      });
    });
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

async function updateStatusOrScore2MySQL(matchChunk) {
  try {
    const { INPLAY, END } = MATCH_STATUS;
    matchChunk.map(async function(match) {
      if (match.status === END) await mysql.Match.update({ status: match.status, home_points: match.homeScore, away_points: match.awayScore }, { where: { bets_id: match.matchId } });
      if (match.status === INPLAY) await mysql.Match.update({ status: match.status }, { where: { bets_id: match.matchId } });
      console.log(`CPBL 完賽 at ${new Date()}`);
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

module.exports = main;
