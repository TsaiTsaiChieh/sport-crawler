const configs = require('../../configs/league/CPBL_configs');
const momentUtil = require('../../helpers/momentUtil');
const { getScheduledAndInplayMatchesFromMySQL } = require('../../helpers/databaseEngine');
const moment = require('moment');
require('moment-timezone');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { CPBL_teamIncludes2id } = require('../../helpers/teamsMapping');
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
    if (!gameData.data.length) return Promise.resolve(data);

    gameData.data.map(function(game) {
      const homeId = CPBL_teamIncludes2id(game.home);
      const awayId = CPBL_teamIncludes2id(game.away);
      const time = game.runtime;
      const scheduled = moment.tz(`${date} ${time}`, 'YYYY-MM-DD hh:mm', configs.taiwanZone).unix();
      matchData.map(function(match) {
        if (homeId === match.homeId && awayId === match.awayId && scheduled === match.scheduled) {
          data.push({
            matchId: match.matchId,
            gameId: game.gameid,
            status: CPBL_statusMapping(game),
            homeScore: game.score_a,
            awayScore: game.score_b,
            scheduled
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
    const { INPLAY, END, POSTPONED } = MATCH_STATUS;
    matchChunk.map(async function(match) {
      if (match.status === END) {
        await mysql.Match.update({ status: match.status, home_points: match.homeScore, away_points: match.awayScore }, { where: { bets_id: match.matchId } });
        console.log(`CPBL 完賽 at ${new Date()}`);
      }
      if (match.status === INPLAY) {
        await mysql.Match.update({ status: match.status, scheduled: match.scheduled, scheduled_tw: match.scheduled * 1000, sr_id: match.gameId }, { where: { bets_id: match.matchId } });
        console.log(`CPBL 開賽 at ${new Date()}`);
      }
      if (match.status === POSTPONED) {
        await mysql.Match.update({ status: match.status }, { where: { bets_id: match.matchId } });
        console.log(`CPBL 延賽 at ${new Date()}`);
      }
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

module.exports = main;
