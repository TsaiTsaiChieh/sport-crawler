const configs = require('../../configs/league/NPB_configs');
const momentUtil = require('../../helpers/momentUtil');
const { getScheduledAndInplayMatchesFromMySQL } = require('../../helpers/databaseEngine');
const moment = require('moment');
require('moment-timezone');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { NPB_teamIncludes2id } = require('../../helpers/teamsMapping');
const { MATCH_STATUS, NPB_statusMapping } = require('../../helpers/statusUtil');
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
      const homeId = NPB_teamIncludes2id(game.home);
      const awayId = NPB_teamIncludes2id(game.away);
      const time = game.runtime;
      const scheduled = moment.tz(`${date} ${time}`, 'YYYY-MM-DD hh:mm', process.env.zone_tw).unix();
      matchData.map(function(match) {
        if (homeId === match.homeId && awayId === match.awayId && scheduled === match.scheduled) {
          const matchId = match.matchId;
          const status = checkMatchStatus(game, matchData, matchId);
          data.push({
            matchId,
            scheduled,
            gameId: game.gameid,
            oriStatus: match.status,
            status,
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

function checkMatchStatus(game, matchData, matchId) {
  let status = NPB_statusMapping(game);
  matchData.map(function(match) {
    // now > 開賽時間且 API 偵測未開打
    const now = Date.now() + 60 * 1000;
    if (match.matchId === matchId && (now >= match.scheduled * 1000 && match.status === MATCH_STATUS.SCHEDULED)) status = MATCH_STATUS.INPLAY;
  });
  return status;
}

async function updateStatusOrScore2MySQL(matchChunk) {
  try {
    const { INPLAY, END, POSTPONED } = MATCH_STATUS;
    const { league, sport } = configs;
    const path = `${sport}/${league}`;
    matchChunk.map(async function(match) {
      const now = momentUtil.taipeiDate(new Date());
      const { matchId } = match;
      if (match.status === END) {
        await set2realtime(`${path}/${matchId}/Summary/status`, END);
        await mysql.Match.update({ status: match.status, home_points: match.homeScore, away_points: match.awayScore }, { where: { bets_id: matchId } });
        console.log(`NPB - ${matchId} 完賽 at ${now}`);
      }
      if (match.oriStatus !== INPLAY && match.status === INPLAY) {
        await set2realtime(`${path}/${matchId}/Summary/status`, INPLAY);
        await mysql.Match.update({ status: match.status, scheduled: match.scheduled, scheduled_tw: match.scheduled * 1000, sr_id: match.gameId }, { where: { bets_id: match.matchId } });
        console.log(`NPB - ${matchId} 開賽 at ${now}`);
      }
      if (match.status === POSTPONED) {
        await set2realtime(`${path}/${matchId}/Summary/status`, POSTPONED);
        await mysql.Match.update({ status: match.status }, { where: { bets_id: match.matchId } });
        console.log(`NPB - ${matchId} 延賽 at ${now}`);
      }
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

module.exports = main;
