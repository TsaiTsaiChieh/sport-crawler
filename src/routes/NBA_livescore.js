const configs = require('../configs/league/NBA_configs');
const { MATCH_STATUS } = require('../helpers/statusUtil');
const { set2realtime } = require('../helpers/firebaseUtil');
const { getData } = require('../helpers/invokeUtil');
const ServerErrors = require('../helpers/ServerErrors');
// The status of NBA live API
const matchStatus = { 3: 'ended', 2: 'inprogress', 1: 'scheduled', end: 3 };
const mysql = require('../helpers/mysqlUtil');

async function livescore(req, res) {
  try {
    const { match_id } = req.query;
    const { league, sport, liveAPI, teamComparisonAPI, locale } = configs;
    const gameId = match_id;
    const liveURL = `${liveAPI}?gameId=${gameId}&locale=${locale}`;
    const teamComparisonURL = `${teamComparisonAPI}?gameId=${gameId}`;
    const liveData = await getData(liveURL);
    const teamStatData = await getData(teamComparisonURL);
    const path = `${sport}/${league}/${gameId}/Summary`;
    const result = await updateLiveAndTeamData({ liveData, teamStatData }, gameId, path);
    return res.json(result);
  } catch (err) {
    return res.status(500).json(err.stack);
  }
}

// 全部更新
async function updateLiveAndTeamData(matchData, gameId, path) {
  try {
    const result = [];
    const { liveData, teamStatData } = matchData;

    const { payload } = liveData;
    let playByPlays = [];
    if (payload) playByPlays = payload.playByPlays;
    if (!playByPlays.length) return Promise.resolve();

    await updateTeamsStat(teamStatData, path);
    const { status } = payload.boxscore;
    const awayTotalPoints = payload.boxscore.awayScore;
    const homeTotalPoints = payload.boxscore.homeScore;
    await updateMatchEndStatus2MySQL({ status, gameId, awayTotalPoints, homeTotalPoints }, path);
    const nowPeriod = payload.boxscore.period;
    const clock = playByPlays[0].events[0].gameClock;
    const eventOrderAtNowPeriod = payload.playByPlays[0].events.length;
    const statusDes = matchStatus[payload.boxscore.status];

    await set2realtime(`${path}/Now_periods`, nowPeriod);
    await set2realtime(`${path}/Now_clock`, clock);
    await set2realtime(`${path}/Now_event_order`, eventOrderAtNowPeriod);
    await set2realtime(`${path}/status`, statusDes);
    await set2realtime(`${path}/info/away/Total/points`, awayTotalPoints);
    await set2realtime(`${path}/info/home/Total/points`, homeTotalPoints);
    const awayId = payload.gameProfile.awayTeamId;
    const homeId = payload.gameProfile.homeTeamId;

    for (let i = 0; i < playByPlays.length; i++) {
      const period = playByPlays[i].period;
      // Subtract the points from the previous round
      const awayScoreTmp = parseInt(playByPlays[i].events[playByPlays[i].events.length - 1].awayScore);
      const homeScoreTmp = parseInt(playByPlays[i].events[playByPlays[i].events.length - 1].homeScore);
      const awayScore = parseInt(playByPlays[i].events[0].awayScore) - awayScoreTmp;
      const homeScore = parseInt(playByPlays[i].events[0].homeScore) - homeScoreTmp;
      await set2realtime(`${path}/info/away/periods${period}/points`, String(awayScore));
      await set2realtime(`${path}/info/home/periods${period}/points`, String(homeScore));

      for (let j = playByPlays[i].events.length; j > 0; j--) {
        const event = playByPlays[i].events[j - 1];
        let descriptionCh = filterSymbol(event.description, ']');
        if (event.messageType === '12') descriptionCh = replaceDescription(period, '開始');
        if (event.messageType === '13') descriptionCh = replaceDescription(period, '結束');
        const specificPath = `${path}/periods${period}/events${playByPlays[i].events.length - j + 1}`;
        await set2realtime(`${specificPath}/Period`, period);
        await set2realtime(`${specificPath}/Clock`, clock);
        await set2realtime(`${specificPath}/attribution`, messageTypeMapping(event.teamId, awayId, homeId));
        await set2realtime(`${specificPath}/description_ch`, descriptionCh);
        const logging = `更新 NBA 文字直播: ${gameId} - ${descriptionCh}`;
        result.push(logging);
      }
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

async function updateMatchEndStatus2MySQL(matchData, path) {
  try {
    const { status, gameId, awayTotalPoints, homeTotalPoints } = matchData;
    if (parseInt(status) === matchStatus.end) {
      await mysql.Match.update(
        {
          status: MATCH_STATUS.END,
          home_points: homeTotalPoints,
          away_points: awayTotalPoints
        },
        { where: { bets_id: gameId } });
      await set2realtime(`${path}/status`, { status: matchStatus['3'] });
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

async function updateTeamsStat(data, path) {
  try {
    const { payload } = data;
    if (payload) {
      const awayStats = payload.awayTeam.score;
      const homeStats = payload.homeTeam.score;
      const awayData = {
        fouls: awayStats.fouls,
        ft_point_attempts: awayStats.fta, // 罰球
        ft_point_scored: awayStats.ftm,
        ft_point_percent: awayStats.ftpct,
        fg_point_attempts: awayStats.fga, // 投籃
        fg_point_scored: awayStats.fgm,
        fg_point_percent: awayStats.fgpct,
        three_point_attempts: awayStats.tpa,
        three_point_scored: awayStats.tpm,
        three_point_percent: awayStats.tppct,
        rebounds: awayStats.rebs, // 籃板 REB
        turnovers: awayStats.turnovers, // 失誤 TO
        assists: awayStats.assists, // 助攻 AST
        blocks: awayStats.blocksAgainst, // 阻攻 BLK
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
        fg_point_attempts: homeStats.fga,
        fg_point_scored: homeStats.fgm,
        fg_point_percent: homeStats.fgpct,
        three_point_attempts: homeStats.tpa,
        three_point_scored: homeStats.tpm,
        three_point_percent: homeStats.tppct,
        rebounds: homeStats.rebs,
        turnovers: homeStats.turnovers,
        assists: homeStats.assists,
        blocks: homeStats.blocksAgainst,
        steals: homeStats.steals,
        fast_break_points: homeStats.fastBreakPoints,
        points_in_paint: homeStats.pointsInPaint,
        points_off_turnovers: homeStats.pointsOffTurnovers,
        biggest_lead: homeStats.biggestLead
      };
      for (const key in awayData) await set2realtime(`${path}/info/away/Total/${key}`, awayData[key]);
      for (const key in homeData) await set2realtime(`${path}/info/home/Total/${key}`, homeData[key]);
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}
module.exports = livescore;
