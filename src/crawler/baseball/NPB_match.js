const moment = require('moment');
require('moment-timezone');
const configs = require('../../configs/league/NPB_configs');
const momentUtil = require('../../helpers/momentUtil');
const { crawler } = require('../../helpers/invokeUtil');
const { NPB_teamName2id } = require('../../helpers/teamsMapping');
const mysql = require('../../helpers/mysqlUtil');
const { MATCH_STATUS } = require('../../helpers/statusUtil');
const { zone_tw } = process.env;
const { set2realtime } = require('../../helpers/firebaseUtil');

async function main() {
  try {
    const { league, sport, league_id, sport_id, ori_league_id } = configs;
    const path = `${sport}/${league}`;
    const next1Date = momentUtil.timestamp2date(Date.now(), { op: 'add', value: 1, unit: 'days', format: 'YYYY-MM-DD' });
    const next2Date = momentUtil.timestamp2date(Date.now(), { op: 'add', value: 2, unit: 'days', format: 'YYYY-MM-DD' });
    const aimYear = next1Date.split('-')[0];
    let aimMonth = next1Date.split('-')[1];
    let aimDay = next1Date.split('-')[2];
    let nextMonth = next2Date.split('-')[1];
    let nextDay = next2Date.split('-')[2];
    const URL = `https://npb.jp/games/${aimYear}/schedule_${aimMonth}_detail.html`;
    aimMonth = aimMonth[0] === '0' ? aimMonth[1] : aimMonth;
    nextMonth = nextMonth[0] === '0' ? nextMonth[1] : nextMonth;
    const data = await crawler(URL);
    const result = [];
    data('tr').each(function(count) {
      result[count] = [];
      let schedule = data(this).text().replace(/\r/g, '');
      schedule = schedule.replace(/\n/g, '');
      schedule = schedule.replace(/\t/g, ' ');
      schedule = schedule.split(' ');
      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i] === '') {
          continue;
        } else {
          result[count].push(schedule[i].trim());
        }
      }
    });
    let flag = 0;
    let matchCount = 1;
    let fullMonth;
    if (aimDay[0] === '0') {
      aimDay = aimDay[1];
    }
    if (nextDay[0] === '0') {
      nextDay = nextDay[1];
    }
    for (let i = 0; i < result.length; i++) {
      const ele = result[i];
      if (ele[0].split('（')[0] === `${aimMonth}/${aimDay}`) {
        flag = 1;
        fullMonth = aimMonth.length < 2 ? `0${aimMonth}` : aimMonth;
      } else if (ele[0].split('（')[0] === `${nextMonth}/${nextDay}`) {
        flag = 0;
        break;
      }
      if (flag === 1) {
        // 表示為明天的賽事
        if (ele.length === 8) {
          // 明日的第一場比賽 1~7 為 賽事資訊
          const homeTeamID = NPB_teamName2id(ele[1]);
          const awayTeamID = NPB_teamName2id(ele[5]);
          const scheduleTime = `${aimYear}-${fullMonth}-${aimDay} ${ele[7]}:00`;
          const scheduled = moment.tz(scheduleTime, 'YYYY-MM-DD HH:mm:ss', zone_tw).unix() - 3600;
          const matchId = `${aimYear}${fullMonth}${aimDay}${league_id}00${matchCount}`;
          const status = MATCH_STATUS.SCHEDULED;
          await set2realtime(`${path}/${matchId}/Summary/status`, { status });
          await mysql.Match.upsert({
            bets_id: matchId,
            league_id: league_id,
            sport_id: sport_id,
            home_id: homeTeamID,
            away_id: awayTeamID,
            scheduled: scheduled,
            scheduled_tw: scheduled * 1000,
            flag_prematch: MATCH_STATUS.VALID,
            status,
            ori_league_id: ori_league_id,
            ori_sport_id: sport_id
          });
          logResult(league, `${aimYear}${fullMonth}${aimDay}${league_id}00${matchCount}`, ele[1], homeTeamID, ele[5], awayTeamID);
          matchCount = matchCount + 1;
        } else if (ele.length === 7) {
          // 明日的其他場比賽 0~6 為 賽事資訊
          const homeTeamID = NPB_teamName2id(ele[0]);
          const awayTeamID = NPB_teamName2id(ele[4]);
          const scheduleTime = `${aimYear}-${fullMonth}-${aimDay} ${ele[6]}:00`;
          const scheduled = moment.tz(scheduleTime, 'YYYY-MM-DD HH:mm:ss', zone_tw).unix() - 3600;
          await mysql.Match.upsert({
            bets_id: `${aimYear}${fullMonth}${aimDay}${league_id}00${matchCount}`,
            league_id: league_id,
            sport_id: sport_id,
            home_id: homeTeamID,
            away_id: awayTeamID,
            scheduled: scheduled,
            scheduled_tw: scheduled * 1000,
            flag_prematch: MATCH_STATUS.VALID,
            status: MATCH_STATUS.SCHEDULED,
            ori_league_id: ori_league_id,
            ori_sport_id: sport_id
          });
          logResult(league, `${aimYear}${fullMonth}${aimDay}${league_id}00${matchCount}`, ele[0], homeTeamID, ele[4], awayTeamID);
          matchCount = matchCount + 1;
        } else if (ele.length === 6) {
          // 明日其中一場為中止比賽
          const homeTeamID = NPB_teamName2id(ele[0]);
          const awayTeamID = NPB_teamName2id(ele[2]);
          const scheduleTime = `${aimYear}-${fullMonth}-${aimDay} ${ele[5]}:00`;
          const scheduled = moment.tz(scheduleTime, 'YYYY-MM-DD HH:mm:ss', zone_tw).unix() - 3600;
          await mysql.Match.upsert({
            bets_id: `${aimYear}${fullMonth}${aimDay}${league_id}00${matchCount}`,
            league_id: league_id,
            sport_id: sport_id,
            home_id: homeTeamID,
            away_id: awayTeamID,
            scheduled: scheduled,
            scheduled_tw: scheduled * 1000,
            flag_prematch: MATCH_STATUS.VALID,
            status: MATCH_STATUS.POSTPONED,
            ori_league_id: ori_league_id,
            ori_sport_id: sport_id
          });
          logResult(league, `${aimYear}${fullMonth}${aimDay}${league_id}00${matchCount}`, ele[0], homeTeamID, ele[2], awayTeamID);
          matchCount = matchCount + 1;
        }
      }
    }
    // console.log(result);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

function logResult(league, matchId, homeName, homeId, awayName, awayId) {
  console.log(`更新 ${league}: ${matchId} - ${homeName}(${homeId}) vs ${awayName}(${awayId}) 成功`);
}
module.exports = main;
