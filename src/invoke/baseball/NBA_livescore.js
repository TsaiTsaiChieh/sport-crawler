const { MATCH_STATUS, leagueCodebook } = require('../../helpers/leaguesUtil');
const { Sequelize } = require('sequelize');
const { Op } = Sequelize;
const { set2realtime } = require('../../helpers/firebaseUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
// The status of NBA live API
const matchStatus = { 3: 'ended', 2: 'inprogress', 1: 'scheduled', end: 3 };
const mysql = require('../../helpers/mysqlUtil');

const configs = {
  league: 'NBA',
  sport: 'basketball',
  liveAPI: 'https://tw.global.nba.com/stats2/game/playbyplay.json',
  teamComparisonAPI: 'https://tw.global.nba.com/stats2/game/snapshot.json',
  period: 0,
  locale: process.env.locale
};

/*
* 1. Select matches from MySQL which status is scheduled and inplay,
*    and scheduled time is less or equal then now unix time.
* 2. Get the step 1 data, if the status of match is scheduled,
*    change its status to inplay and update this match data to MySQL.
*/

async function main() {
  try {
    // XXX Consider redis implement
    const nowUnix = Math.floor(Date.now() / 1000);
    const matchData = await getMatchDataFromMySQL(nowUnix);
    await updateMatchInplayStatus2MySQL(matchData);
    await liveTextStart(matchData);
    await teamStatData(matchData);
  } catch (err) {
    console.log(err);
    return err;
  }
}

async function getMatchDataFromMySQL(nowUnix) {
  try {
    const leagueId = leagueCodebook(configs.league).id;
    // Index is range, taking about 170ms
    const result = await mysql.Match.findAll({
      attributes: [['bets_id', 'matchId'], 'status'],
      where: {
        league_id: leagueId,
        status: { [Op.or]: [MATCH_STATUS.SCHEDULED, MATCH_STATUS.INPLAY] },
        scheduled: { [Op.lte]: nowUnix }
      },
      raw: true
    });
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err.stack);
  }
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

async function liveTextStart(data) {
  try {
    if (data.length) {
      data.map(async function(ele) {
        const { league, sport, liveAPI, locale } = configs;
        const gameId = ele.matchId;
        const URL = `${liveAPI}?gameId=${gameId}&locale=${locale}`;
        const data = await getData(URL);
        const path = `${sport}/${league}/${gameId}`;
        const matchChunk = await repackageMatches(data, gameId, path);
        await set2realtime(path, matchChunk);
      });
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}
// 全部更新
async function repackageMatches(matchData, gameId, realtimePath) {
  try {
    const { payload } = matchData;
    let playByPlays = [];
    if (payload) playByPlays = payload.playByPlays;

    if (playByPlays.length) {
      const { status } = payload.boxscore;
      await updateMatchEndStatus2DB(status, gameId, realtimePath);
      const nowPeriod = payload.boxscore.period;
      const clock = !payload.boxscore.periodClock ? '00:00' : payload.boxscore.periodClock;
      const eventOrderAtNowPeriod = payload.playByPlays[0].events.length;
      const Summary = {
        Now_clock: clock,
        Now_periods: nowPeriod,
        Now_event_order: eventOrderAtNowPeriod,
        status: matchStatus[payload.boxscore.status],
        info: {
          away: { Total: { points: payload.boxscore.awayScore } },
          home: { Total: { points: payload.boxscore.homeScore } }
        }
      };

      const awayId = payload.gameProfile.awayTeamId;
      const homeId = payload.gameProfile.homeTeamId;

      for (let i = 0; i < playByPlays.length; i++) {
        const period = playByPlays[i].period;
        Summary.info.away[`periods${period}`] = {};
        Summary.info.home[`periods${period}`] = {};
        Summary[`periods${period}`] = {};
        // Subtract the points from the previous round
        const awayScoreTmp = parseInt(playByPlays[i].events[playByPlays[i].events.length - 1].awayScore);
        const homeScoreTmp = parseInt(playByPlays[i].events[playByPlays[i].events.length - 1].homeScore);

        for (let j = playByPlays[i].events.length; j > 0; j--) {
          const event = playByPlays[i].events[j - 1];
          const awayScore = parseInt(event.awayScore) - awayScoreTmp;
          const homeScore = parseInt(event.homeScore) - homeScoreTmp;
          Summary.info.away[`periods${period}`].points = String(awayScore);
          Summary.info.home[`periods${period}`].points = String(homeScore);
          let descriptionCh = filterSymbol(event.description, ']');
          if (event.messageType === '12') descriptionCh = replaceDescription(period, '開始');
          if (event.messageType === '13') descriptionCh = replaceDescription(period, '結束');
          Summary[`periods${period}`][`events${playByPlays[i].events.length - j + 1}`] = {
            Period: period,
            Clock: event.gameClock,
            attribution: messageTypeMapping(event.teamId, awayId, homeId),
            description_ch: descriptionCh
          };
        }
      }
      return Promise.resolve({ Summary });
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

async function updateMatchEndStatus2DB(status, gameId, path) {
  try {
    if (parseInt(status) === matchStatus.end) {
      await mysql.Match.update(
        { status: MATCH_STATUS.END },
        { where: { bets_id: gameId } });
      await set2realtime(path, { Summary: { status: matchStatus['3'] } });
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

function messageTypeMapping(teamId, awayId, homeId) {
  if (teamId === awayId) return 'away';
  else if (teamId === homeId) return 'home';
  else return 'common';
}

function filterSymbol(str, symbol) {
  const index = str.indexOf(symbol);
  return str.substring(index + 1).trim();
}

function replaceDescription(period, append) {
  return `第${period}節${append}`;
}

async function teamStatData(data) {
  try {
    if (data.length) {
      data.map(async function(ele) {
        const { league, sport, teamComparisonAPI } = configs;
        const gameId = ele.matchId;
        const URL = `${teamComparisonAPI}?gameId=${gameId}`;
        const data = await getData(URL);
        const path = `${sport}/${league}/${gameId}`;
        await repackageTeamsStat(data, gameId, path);
      });
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err.stack);
  }
}

async function repackageTeamsStat(data, gameId, path) {
  try {
    const { payload } = data;
    if (payload) {
      const awayStats = payload.awayTeam.score;
      const homeStats = payload.homeTeam.score;
      const awayData = {
        fouls: awayStats.fouls,
        ft_point_attempts: awayStats.fta,
        ft_point_scored: awayStats.ftm,
        ft_point_percent: awayStats.ftpct,
        two_point_attempts: awayStats.fga,
        two_point_scored: awayStats.fgm,
        two_point_percent: awayStats.fgpct,
        three_point_attempts: awayStats.tpa,
        three_point_scored: awayStats.tpm,
        three_point_percent: awayStats.tppct,
        rebounds: awayStats.rebs, // 籃板 REB
        turnovers: awayStats.turnovers, // 失誤 TO
        assists: awayStats.assists, // 助攻 AST
        blocks_against: awayStats.blocksAgainst, // 阻攻 BLK
        steals: awayStats.steals, // 抄截 STL
        fast_break_points: awayStats.fastBreakPoints, // 快攻得分 FBP
        points_in_paint: awayStats.pointsInPaint, // 禁區得分 PITP
        points_off_turnovers: awayStats.pointsOffTurnovers, // 因對方失誤得分 POT
        biggest_lead: awayStats.biggestLead // 最多領先分數 BL
      };
      const homeData = {
        fouls: homeStats.fouls,
        ft_point_attempts: homeStats.fta,
        ft_point_scored: homeStats.ftm,
        ft_point_percent: homeStats.ftpct,
        two_point_attempts: homeStats.fga,
        two_point_scored: homeStats.fgm,
        two_point_percent: homeStats.fgpct,
        three_point_attempts: homeStats.tpa,
        three_point_scored: homeStats.tpm,
        three_point_percent: homeStats.tppct,
        rebounds: homeStats.rebs, // 籃板 REB
        turnovers: homeStats.turnovers, // 失誤 TO
        assists: homeStats.assists, // 助攻 AST
        blocks_against: homeStats.blocksAgainst, // 阻攻 BLK
        steals: homeStats.steals, // 抄截 STL
        fast_break_points: homeStats.fastBreakPoints, // 快攻得分 FBP
        points_in_paint: homeStats.pointsInPaint, // 禁區得分 PITP
        points_off_turnovers: homeStats.pointsOffTurnovers, // 因對方失誤得分 POT
        biggest_lead: homeStats.biggestLead // 最多領先分數 BL
      };
      for (const key in awayData) await set2realtime(`${path}/Summary/info/away/Total/${key}`, awayData[key]);
      for (const key in homeData) await set2realtime(`${path}/Summary/info/home/Total/${key}`, homeData[key]);
      console.log(`更新 NBA: ${gameId} 文字直播`);
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}
module.exports = main;
