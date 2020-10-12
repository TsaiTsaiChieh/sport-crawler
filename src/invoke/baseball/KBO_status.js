const configs = require('../../configs/league/KBO_configs');
const { getData } = require('../../helpers/invokeUtil');
const momentUtil = require('../../helpers/momentUtil');
const moment = require('moment');
require('moment-timezone');
const ServerErrors = require('../../helpers/ServerErrors');
const { KBO_teamIncludes2id } = require('../../helpers/teamsMapping');
const { MATCH_STATUS, KBO_statusMapping } = require('../../helpers/statusUtil');
const { getScheduledAndInplayMatchesFromMySQL } = require('../../helpers/databaseEngine');
const mysql = require('../../helpers/mysqlUtil');
const { set2realtime } = require('../../helpers/firebaseUtil');

async function main() {
  try {
    const nowUnix = Math.floor(Date.now() / 1000);
    const { league_id } = configs;
    const matchData = await getScheduledAndInplayMatchesFromMySQL(nowUnix, league_id);
    // TODO get schedule time, date = today, invoke API
    if (matchData.length) await invokeAPI(matchData);

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

async function invokeAPI(matchData) {
  let { statusAPI, date, sporttype, union } = configs;
  date = momentUtil.timestamp2date(Date.now(), { format: 'YYYY-MM-DD' });
  const URL = `${statusAPI}?date=${date}&sporttype=${sporttype}&union=${union}`;
  const data = await getData(URL);
  const matchChunk = await repackageMatchData(date, data, matchData);
  await updateStatusOrScore2MySQL(matchChunk);
  return Promise.resolve();
}

async function repackageMatchData(date, gameData, matchData) {
  try {
    const data = [];
    if (!gameData.data.length) return Promise.resolve(data);

    gameData.data.map(function(game) {
      const homeId = KBO_teamIncludes2id(game.home);
      const awayId = KBO_teamIncludes2id(game.away);
      const time = game.runtime;
      const scheduled = moment.tz(`${date} ${time}`, 'YYYY-MM-DD hh:mm', process.env.zone_tw).unix();

      matchData.map(function(match) {
        const { tolerance } = configs;
        const lowerScheduled = moment(match.scheduled * 1000).subtract(tolerance[0], tolerance[1]).unix();
        const upperScheduled = moment(match.scheduled * 1000).add(tolerance[0], tolerance[1]).unix();
        const statusFromAPI = KBO_statusMapping(game.gameid, game.status);
        if (homeId === match.homeId && awayId === match.awayId && (lowerScheduled <= scheduled && scheduled <= upperScheduled) && statusFromAPI !== MATCH_STATUS.SCHEDULED) {
          const matchId = match.matchId;
          const status = checkMatchStatus(statusFromAPI, matchData, matchId);
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

function checkMatchStatus(status, matchData, matchId) {
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
        await mysql.Match.update({ status: match.status, home_points: match.homeScore, away_points: match.awayScore, sr_id: match.gameId }, { where: { bets_id: matchId } });
        console.log(`KBO - ${matchId} 完賽 at ${now}`);
      }
      if (match.oriStatus !== INPLAY && match.status === INPLAY) {
        await set2realtime(`${path}/${matchId}/Summary/status`, INPLAY);
        await mysql.Match.update({ status: match.status, scheduled: match.scheduled, scheduled_tw: match.scheduled * 1000, sr_id: match.gameId }, { where: { bets_id: matchId } });
        console.log(`KBO - ${matchId} 開賽 at ${now}`);
      }
      if (match.status === POSTPONED) {
        await set2realtime(`${path}/${matchId}/Summary/status`, POSTPONED);
        await mysql.Match.update({ status: match.status }, { where: { bets_id: matchId } });
        console.log(`KBO - ${matchId} 延賽 at ${now}`);
      }
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

module.exports = main;
