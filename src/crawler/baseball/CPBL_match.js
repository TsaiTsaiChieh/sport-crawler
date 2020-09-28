const moment = require('moment');
require('moment-timezone');
const momentUtil = require('../../helpers/momentUtil');
const { crawler } = require('../../helpers/invokeUtil');
const { CPBL_teamName2id } = require('../../helpers/teamsMapping');
const mysql = require('../../helpers/mysqlUtil');
const configs = require('../../configs/league/CPBL_configs');
const { MATCH_STATUS } = require('../../helpers/statusUtil');
const { zone_tw } = process.env;

async function main() {
  try {
    const { league, league_id, sport_id, ori_league_id } = configs;
    const date = momentUtil.timestamp2date(Date.now(), { op: 'add', value: 1, unit: 'days', format: 'YYYY-MM-DD' });
    const aimYear = date.split('-')[0];
    const aimMonth = date.split('-')[1];
    const aimDay = date.split('-')[2];
    const URL = `http://www.cpbl.com.tw/games/starters.html?&game_type=01&game_date=${date}`;
    const data = await crawler(URL);
    const result = [];
    data('.game').each(function() {
      let schedule = data(this).text().replace(/\r/g, '');
      schedule = schedule.replace(/\n/g, '');
      schedule = schedule.replace(/\t/g, ' ');
      schedule = schedule.split(' ');
      for (let i = 0; i < schedule.length; i++) {
        if (schedule[i] === '') {
          continue;
        } else {
          result.push(schedule[i].trim());
        }
      }
    });
    const homeID = [];
    const awayID = [];
    let matchCount = 0;
    data('.vs_team img').each(function(index) {
      if (index % 2 === 0) {
        // away
        awayID[matchCount] = CPBL_teamName2id(data(this).attr('src').split('team/')[1].split('_')[0]);
      } else {
        // home
        homeID[matchCount] = CPBL_teamName2id(data(this).attr('src').split('team/')[1].split('_')[0]);
        matchCount = matchCount + 1;
      }
    });

    const $ = await crawler(`http://www.cpbl.com.tw/schedule/index/${date}.html?&date=${date}&gameno=01&sfieldsub=&sgameno=01`);
    let temp = $('td').text();
    temp = temp.replace(/\r/g, ' ');
    temp = temp.replace(/\n/g, ' ');
    temp = temp.replace(/\t/g, ' ');
    temp = temp.split(' ');
    const scheduledTable = [];
    for (let i = 0; i < temp.length; i++) {
      if (temp[i] === '' || temp[i] === ' ') {
        continue;
      } else {
        scheduledTable.push(temp[i]);
      }
    }

    for (let i = 0; i < matchCount; i++) {
      let matchID = result[i * 3];
      matchID = matchID.split('G')[1];
      let scheduled;
      for (let scheduleCount = 0; scheduleCount < scheduledTable.length; scheduleCount++) {
        if (matchID === scheduledTable[scheduleCount]) {
          scheduled = scheduledTable[scheduleCount + 1];
          break;
        }
      }
      let scheduleTime = `${aimYear}-${aimMonth}-${aimDay} ${scheduled}:00`;
      scheduleTime = moment.tz(scheduleTime, 'YYYY-MM-DD HH:mm:ss', zone_tw).unix();
      const gameId = `${aimYear}${aimMonth}${aimDay}${league_id}G${matchID}`;
      await mysql.Match.upsert({
        bets_id: gameId,
        league_id: league_id,
        sport_id: sport_id,
        home_id: homeID[i],
        away_id: awayID[i],
        scheduled: scheduleTime,
        scheduled_tw: scheduleTime * 1000,
        flag_prematch: MATCH_STATUS.VALID,
        status: MATCH_STATUS.SCHEDULED,
        ori_league_id: ori_league_id,
        ori_sport_id: sport_id
      });
      logResult(league, gameId, homeID[i], awayID[i]);
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

function logResult(league, matchId, homeId, awayId) {
  console.log(`更新 ${league}: ${matchId} - ${homeId} vs ${awayId} 成功`);
}

module.exports = main;
