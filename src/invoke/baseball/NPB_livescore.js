const configs = require('../../configs/league/NPB_configs');
const { getScheduledAndInplayMatchesFromMySQL, updateLiveAndTeamData } = require('../../helpers/databaseEngine');
const { timestamp2date } = require('../../helpers/momentUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { NPB_statusMapping, MATCH_STATUS_REALTIME } = require('../../helpers/statusUtil');
const { NPB_teamIncludes2id } = require('../../helpers/teamsMapping');
const moment = require('moment');
require('moment-timezone');

async function main() {
  try {
    const { league_id } = configs;
    const nowUnix = Math.floor(Date.now() / 1000);
    const matchData = await getScheduledAndInplayMatchesFromMySQL(nowUnix, league_id);
    await livescoreStart(matchData);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

async function livescoreStart(matchData) {
  try {
    if (matchData.length) {
      let { livescoreURL, date, sporttype, union } = configs;
      const today = timestamp2date(new Date());
      date = today;
      const URL = `${livescoreURL}?date=${date}&sporttype=${sporttype}&union=${union}`;
      const livescoreData = await getData(URL);
      const livescoreChunk = await repackageLivescore(date, matchData, livescoreData);
      await updateLiveAndTeamData(livescoreChunk, configs);
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

async function repackageLivescore(date, matchData, livescoreData) {
  try {
    const data = [];
    if (!livescoreData.data.length) return Promise.resolve(data);
    matchData.map(function(match) {
      const temp = {
        matchId: match.matchId,
        balls: '0',
        outs: '0',
        strikes: '0',
        innings: '0',
        halfs: '0',
        firstBase: 0,
        secondBase: 0,
        thirdBase: 0,
        status: '',
        home: { },
        away: { },
        Total: { home: { R: 0, H: 0, E: 0 }, away: { R: 0, H: 0, E: 0 } }
      };

      livescoreData.data.map(function(game) {
        const gameId = String(game.gameid);
        const status = NPB_statusMapping(gameId, game.status);
        const homeId = NPB_teamIncludes2id(game.home);
        const awayId = NPB_teamIncludes2id(game.away);
        const time = game.runtime;
        const scheduled = moment.tz(`${date} ${time}`, 'YYYY-MM-DD hh:mm', process.env.zone_tw).unix();
        if (match.homeId === homeId && match.awayId === awayId && match.scheduled === scheduled) {
          temp.gameId = gameId;
          temp.status = MATCH_STATUS_REALTIME[status];
          temp.Total.home.R = game.rb2;
          temp.Total.away.R = game.ra2;
          temp.Total.home.H = game.hb;
          temp.Total.away.H = game.ha;
          temp.Total.home.E = game.eb;
          temp.Total.away.E = game.ea;
          // SBO
          temp.strikes = game.sb.replace('s', '');
          temp.balls = game.bb.replace('b', '');
          temp.outs = game.ob.replace('o', '');
          const currentInning = getCurrentInning(game.da);
          temp.innings = currentInning;
          // 壘板圖
          const base = baseMapping(game.base);
          temp.firstBase = base.first;
          temp.secondBase = base.second;
          temp.thirdBase = base.third;
          temp.halfs = game.runinn.includes('下') ? '1' : '0';
          const homeScore = currentInningScore(currentInning, game.db);
          const awayScore = currentInningScore(currentInning, game.da);
          temp.home[`Innings${currentInning}`] = { runs: homeScore };
          temp.away[`Innings${currentInning}`] = { runs: awayScore };
          data.push(temp);
        }
      });
    });
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

function getCurrentInning(scoreboard) {
  const index = [];
  for (let i = 0; i < scoreboard.length; i++) if (scoreboard[i] === ',') index.push(i);
  for (let i = 0; i < index.length - 1; i++) {
    const temp = index[i + 1];
    if (index[i] + 1 === temp) return i + 1;
  }
  return index.length;
}

function baseMapping(base) {
  const num = Number(base.replace('base', ''));
  const first = num === 1 || num === 3 || num === 5 || num === 7 ? 1 : 0;
  const second = num === 2 || num === 3 || num === 6 || num === 7 ? 1 : 0;
  const third = num === 4 || num === 5 || num === 7 ? 1 : 0;
  return { first, second, third };
}

function currentInningScore(currentInning, str) {
  const indices = [];
  for (let i = 0; i < str.length; i++) if (str[i] === ',') indices.push(i);
  let score = str.substring(indices[currentInning - 2] + 1, indices[currentInning - 1]).trim();
  if (score === '-' && currentInning !== '9') score = '0';
  return score;
}

module.exports = main;
