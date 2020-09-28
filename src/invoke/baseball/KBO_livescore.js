const configs = require('../../configs/league/KBO_configs');
const { getScheduledAndInplayMatchesFromMySQL, updateLiveAndTeamData } = require('../../helpers/databaseEngine');
const { getData } = require('../../helpers/invokeUtil');
const { timestamp2date } = require('../../helpers/momentUtil');
const { KBO_id2Alias, KBO_teamName2id } = require('../../helpers/teamsMapping');
const ServerErrors = require('../../helpers/ServerErrors');
const { MATCH_STATUS, MATCH_STATUS_REALTIME, KBO_statusMapping } = require('../../helpers/statusUtil');
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
      let { baseURL, leId, srId, date } = configs;
      const today = timestamp2date(new Date());
      date = today;
      const baseData = await getData(`${baseURL}?leId=${leId}&srId=${srId}&date=${date}`);
      const livescoreData = await tuneSeasonYearData(matchData, today);
      const livescoreChunk = await repackageLivescore(matchData, livescoreData, baseData);
      await updateLiveAndTeamData(livescoreChunk, configs);
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

async function tuneSeasonYearData(matchData, today) {
  const { nullThreshold } = configs;
  const livescoreThisYear = concatURL(matchData, today, 0);
  let livescoreData = await getData(livescoreThisYear);
  if (livescoreData.length < nullThreshold) return livescoreData;
  // 長度 > nullThreshold，代表資料無效，改打去年，也無效傳回傳 null
  else if (livescoreData.length >= nullThreshold) {
    livescoreData = await getData(concatURL(matchData, today, 1));
    if (livescoreData.length < nullThreshold) return livescoreData;
    else return null;
  }
}

function concatURL(matchData, today, minus) {
  const year = Number(today.substring(0, 4)) - minus;
  let { livescoreURL, gameId } = configs;
  const { homeId, awayId } = matchData[0];
  const homeAlias = KBO_id2Alias(homeId);
  const awayAlias = KBO_id2Alias(awayId);
  gameId = `${today}${awayAlias}${homeAlias}0${year}`;
  const URL = `${livescoreURL}?gameId=${gameId}`;
  return URL;
}

async function repackageLivescore(matchData, livescoreData, baseData) {
  try {
    if (!livescoreData) return Promise.resolve();
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
        status: MATCH_STATUS_REALTIME[2],
        home: { },
        away: { },
        Total: { home: { R: 0, H: 0, E: 0 }, away: { R: 0, H: 0, E: 0 } }
      };
      baseData.game.map(function(base) {
        const homeId = KBO_teamName2id(base.HOME_ID);
        const awayId = KBO_teamName2id(base.AWAY_ID);
        const day = base.G_DT;
        const time = base.G_TM;
        const scheduled = moment.tz(`${day} ${time}`, 'YYYYMMDD hh:mm', configs.KoreaZone).unix();
        if (match.homeId === homeId && match.awayId === awayId && match.scheduled === scheduled) {
          temp.baseId = base.G_ID;
          temp.balls = String(base.BALL_CN);
          temp.outs = String(base.OUT_CN);
          temp.strikes = String(base.STRIKE_CN);
          temp.innings = String(base.GAME_INN_NO);
          temp.halfs = base.GAME_TB_SC === 'B' ? '1' : '0';
          temp.firstBase = (base.B1_BAT_ORDER_NO === null || base.B1_BAT_ORDER_NO === 0) ? 0 : 1;
          temp.secondBase = (base.B2_BAT_ORDER_NO === null || base.B2_BAT_ORDER_NO === 0) ? 0 : 1;
          temp.thirdBase = (base.B3_BAT_ORDER_NO === null || base.B3_BAT_ORDER_NO === 0) ? 0 : 1;
        }
      });
      livescoreData.map(function(game) {
        // From 2020-09-24 18:30:00.0 to 2020-09-24 18:30:00, skip .0
        const gameDateTime = game.gameDateTime.substring(0, game.gameDateTime.indexOf('.'));
        const scheduled = moment.tz(gameDateTime, 'YYYY-MM-DD hh:mm:ss', configs.KoreaZone).unix();
        const homeId = KBO_teamName2id(game.homeTeamCode);
        const awayId = KBO_teamName2id(game.awayTeamCode);

        if (match.homeId === homeId && match.awayId === awayId && match.scheduled === scheduled) {
          temp.gameId = game.gameId;
          const { gameInfo } = game;
          const status = KBO_statusMapping(game.gameId, game.statusNum);
          temp.status = MATCH_STATUS_REALTIME[status];
          const homeByInning = gameInfo.home_team_score_by_inning;
          const awayByInning = gameInfo.away_team_score_by_inning;
          const homeRHE = gameInfo.home_team_rheb;
          const awayRHE = gameInfo.away_team_rheb;
          const scoreBoard = deconstructInning(temp.innings, { homeByInning, awayByInning, homeRHE, awayRHE });
          temp.Total.home.R = scoreBoard.home.R;
          temp.Total.home.H = scoreBoard.home.H;
          temp.Total.home.E = scoreBoard.home.E;
          temp.Total.away.R = scoreBoard.away.R;
          temp.Total.away.H = scoreBoard.away.H;
          temp.Total.away.E = scoreBoard.away.E;
          if (status === MATCH_STATUS.END && scoreBoard.home.runs === '-') scoreBoard.home.runs = 'X';
          if (status === MATCH_STATUS.END && scoreBoard.away.runs === '-') scoreBoard.away.runs = 'X';
          temp.home[`Innings${scoreBoard.inning}`] = { runs: scoreBoard.home.runs };
          temp.away[`Innings${scoreBoard.inning}`] = { runs: scoreBoard.away.runs };
        }
        data.push(temp);
      });
    });
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

function deconstructInning(currentInning, inningData) {
  const { homeByInning, awayByInning, homeRHE, awayRHE } = inningData;
  const homeScore = currentInningScore(currentInning, homeByInning);
  const awayScore = currentInningScore(currentInning, awayByInning);
  const homeRHEData = returnRHE(homeRHE);
  const awayRHEData = returnRHE(awayRHE);
  return {
    inning: currentInning,
    home: {
      runs: homeScore,
      R: homeRHEData.R,
      H: homeRHEData.H,
      E: homeRHEData.E
    },
    away: {
      runs: awayScore,
      R: awayRHEData.R,
      H: awayRHEData.H,
      E: awayRHEData.E
    }
  };
}

function currentInningScore(currentInning, str) {
  const indices = [];
  for (let i = 0; i < str.length; i++) if (str[i] === ',') indices.push(i);
  let score = str.substring(indices[currentInning - 2] + 1, indices[currentInning - 1]).trim();
  if (score === '-' && currentInning !== '9') score = '0';
  return score;
}

function returnRHE(str) {
  const indices = [];
  for (let i = 0; i < str.length; i++) if (str[i] === ',') indices.push(i);
  let R = str.substring(0, indices[0]).trim();
  let H = str.substring(indices[0] + 1, indices[1]).trim();
  let E = str.substring(indices[1] + 1, indices[2]).trim();
  if (R === '-') R = '0';
  if (H === '-') H = '0';
  if (E === '-') E = '0';
  return { R, H, E };
}

module.exports = main;
