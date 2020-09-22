const configs = require('../../configs/league/MLB_configs');
const { getScheduledAndInplayMatchesFromMySQL } = require('../../helpers/databaseEngine');
const mysql = require('../../helpers/mysqlUtil');
const { getData } = require('../../helpers/invokeUtil');
const momentUtil = require('../../helpers/momentUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { MATCH_STATUS, MATCH_STATUS_REALTIME, MLB_statusMapping } = require('../../helpers/statusUtil');
const { set2realtime } = require('../../helpers/firebaseUtil');

async function main() {
  const { league_id } = configs;
  const nowUnix = Math.floor(Date.now() / 1000);
  const matchData = await getScheduledAndInplayMatchesFromMySQL(nowUnix, league_id);
  await updateMatchInplayStatus2MySQL(matchData);
  await livescoreStart(matchData);
}

async function updateMatchInplayStatus2MySQL(data) {
  try {
    if (data.length) {
      data.map(async function(ele) {
        if (ele.status === MATCH_STATUS.SCHEDULED) {
          await mysql.Match.update(
            { status: MATCH_STATUS.INPLAY },
            { where: { bets_id: ele.matchId } });
        }
      });
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

async function livescoreStart(matchData) {
  try {
    if (matchData.length) {
      const livescoreURL = concatURL();
      const livescoreData = await getData(livescoreURL);
      const livescoreChunk = await repackageLivescore(matchData, livescoreData);
      await updateLiveAndTeamData(livescoreChunk);
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

function concatURL() {
  let { scoreBoardAPI, stitch_env, sportId, startDate, endDate, gameTypes, leagueId } = configs;
  const yesterday = momentUtil.timestamp2date(Date.now(), { op: 'subtract', value: 1, unit: 'days', format: 'YYYY-MM-DD' });
  startDate = yesterday;
  endDate = yesterday;
  let livescoreURL = `${scoreBoardAPI}?stitch_env=${stitch_env}&sportId=${sportId}&startDate=${startDate}&endDate=${endDate}&leagueId=${leagueId}`;

  gameTypes.map(function(gameType) {
    livescoreURL += `&gameType=${gameType}`;
  });
  return livescoreURL;
}

async function repackageLivescore(matchData, livescoreData) {
  try {
    if (!livescoreData.dates[0].games.length) return Promise.resolve();
    const data = [];
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
      livescoreData.dates[0].games.map(function(game) {
        const gamePk = String(game.gamePk);
        const detailedStatus = game.status.detailedState;
        const codedGameState = game.status.codedGameState;
        const abstractGameCode = game.status.abstractGameCode;
        const status = MLB_statusMapping(gamePk, { detailedStatus, codedGameState, abstractGameCode });

        if (match.matchId === gamePk && game.linescore.currentInning > 0) {
          temp.status = MATCH_STATUS_REALTIME[status];
          const { linescore } = game;
          game.linescore.innings.map(function(inning) {
            if (inning.home.runs) temp.Total.home.R += inning.home.runs;
            if (inning.away.runs) temp.Total.away.R += inning.away.runs;
            if (inning.home.hits) temp.Total.home.H += inning.home.hits;
            if (inning.away.hits) temp.Total.away.H += inning.away.hits;
            if (inning.home.errors) temp.Total.home.E += inning.home.errors;
            if (inning.away.errors) temp.Total.away.E += inning.away.errors;
            // SBO
            temp.strikes = String(linescore.strikes);
            temp.balls = String(linescore.balls);
            temp.outs = String(linescore.outs);
            temp.innings = String(linescore.currentInning);
            // 壘板圖
            if (linescore.offense.first) temp.firstBase = 1;
            if (linescore.offense.second) temp.secondBase = 1;
            if (linescore.offense.third) temp.thirdBase = 1;
            temp.halfs = linescore.inningHalf === 'Top' ? '0' : '1';
            temp.home[`Innings${inning.num}`] = { runs: inning.home.runs || inning.home.runs === 0 ? String(inning.home.runs) : 'X' };
            temp.away[`Innings${inning.num}`] = { runs: inning.away.runs || inning.away.runs === 0 ? String(inning.away.runs) : 'X' };
            data.push(temp);
          });
        }
      });
    });
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

async function updateLiveAndTeamData(livescoreData) {
  const { sport, league } = configs;
  livescoreData.map(async function(ele) {
    const path = `${sport}/${league}/${ele.matchId}/Summary`;
    await set2realtime(`${path}/Now_innings`, ele.innings);
    // 壘板
    await set2realtime(`${path}/Now_firstbase`, ele.firstBase);
    await set2realtime(`${path}/Now_secondbase`, ele.secondBase);
    await set2realtime(`${path}/Now_thirdbase`, ele.thirdBase);
    // 計分板
    await set2realtime(`${path}/Now_balls`, ele.balls);
    await set2realtime(`${path}/Now_outs`, ele.outs);
    await set2realtime(`${path}/Now_strikes`, ele.strikes);
    await set2realtime(`${path}/Now_halfs`, ele.halfs);
    await set2realtime(`${path}/status`, String(ele.status));
    await set2realtime(`${path}/info/home/Total/points`, String(ele.Total.home.R));
    await set2realtime(`${path}/info/away/Total/points`, String(ele.Total.away.R));
    await set2realtime(`${path}/info/home/Total/hits`, String(ele.Total.home.H));
    await set2realtime(`${path}/info/away/Total/hits`, String(ele.Total.away.H));
    await set2realtime(`${path}/info/home/Total/errors`, String(ele.Total.home.E));
    await set2realtime(`${path}/info/away/Total/errors`, String(ele.Total.away.E));

    for (const key in ele.home) await set2realtime(`${path}/info/home/${key}/scoring/runs`, ele.home[key].runs);
    for (const key in ele.away) await set2realtime(`${path}/info/away/${key}/scoring/runs`, ele.away[key].runs);
  });
}
module.exports = main;
