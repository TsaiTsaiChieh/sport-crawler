const configs = require('../../configs/league/NPB_configs');
const momentUtil = require('../../helpers/momentUtil');
const { crawler } = require('../../helpers/invokeUtil');
const { NPB_teamName2id } = require('../../helpers/teamsMapping');
const mysql = require('../../helpers/mysqlUtil');
const { MATCH_STATUS } = require('../../helpers/statusUtil');
const { set2realtime } = require('../../helpers/firebaseUtil');

async function main() {
  const { league, league_id, sport } = configs;
  const nowTime = Date.now();
  const date = momentUtil.timestamp2date(nowTime, { op: 'add', value: 0, unit: 'days', format: 'YYYY-MM-DD' });
  const aimYear = date.split('-')[0];
  const totalData = await queryForEvents(league_id, nowTime);
  const inningsInfo = await crawlerInningsOfMatch();
  for (let i = 0; i < totalData.length; i++) {
    const betsID = totalData[i].bets_id;
    const gameTime = totalData[i].scheduled * 1000;
    const eventStatus = totalData[i].status;
    const path = `${sport}/${league}/${betsID}/Summary`;
    switch (eventStatus) {
      case 2: {
        if (gameTime <= nowTime) {
          try {
            await mysql.Match.upsert({
              bets_id: betsID,
              status: 1
            });
            await set2realtime(`${path}/status`, 'inprogress');
            await NPBpbpInplay(path, totalData[i], inningsInfo, aimYear);
          } catch (err) {
            return Promise.reject(err);
          }
        } else {
          try {
            await set2realtime(`${path}/status`, 'scheduled');
          } catch (err) {
            return Promise.reject(err);
          }
        }
        break;
      }
      case 1: {
        await NPBpbpInplay(path, totalData[i], inningsInfo, aimYear);
        break;
      }
      default: {
      }
    }
  }
}

async function queryForEvents(leagueID, nowTime) {
  try {
    const queries = await mysql.sequelize.query(
        `
				 SELECT game.bets_id AS bets_id, game.scheduled AS scheduled, game.status AS status, game.league_id AS league_id, game.home_id AS home_id, game.away_id AS away_id
					 FROM matches AS game
					WHERE (game.status = ${MATCH_STATUS.SCHEDULED} OR game.status = ${MATCH_STATUS.INPLAY})
						AND game.league_id = ${leagueID}
						AND game.scheduled*1000 BETWEEN ${nowTime}-43200000 AND ${nowTime}+43200000
			 `,
        {
          type: mysql.sequelize.QueryTypes.SELECT
        }
    );
    return Promise.resolve(queries);
  } catch (err) {
    return Promise.reject(err);
  }
}
async function crawlerInningsOfMatch() {
  const URL = 'https://npb.jp/games/2020/';
  const data = await crawler(URL);
  let aimMonth;
  let aimDay;
  let aimDate;
  const apiHomeTeam = [];
  const apiAwayTeam = [];
  const matchState = [];
  const matchLinks = [];
  data('h5').each(function() {
    aimMonth = data(this).text().split('月')[0];
    if (aimMonth.length === 1) {
      aimMonth = `0${aimMonth}`;
    }
    aimDay = data(this).text().split('月')[1].split('日')[0];
    aimDate = `${aimMonth}${aimDay}`;
  });

  data('.score_table_wrap .team1 img').each(function() {
    // apiHomeTeam.push(data(this).attr('src'));
    apiHomeTeam.push(data(this).attr('src').split('logo_')[1].split('_')[0]);
  });
  data('.score_table_wrap .team2 img').each(function() {
    apiAwayTeam.push(data(this).attr('src').split('logo_')[1].split('_')[0]);
  });
  data('.score_table_wrap .state').each(function() {
    let temp = data(this).text().replace(/\r/g, '');
    temp = temp.replace(/\n/g, '');
    temp = temp.replace(/\t/g, ' ');
    temp = temp.split(' ');
    for (let i = 0; i < temp.length; i++) {
      if (temp[i] === '') {
        continue;
      } else {
        matchState.push(temp[i].trim());
      }
    }
  });
  data('.link_block').each(function(index, ele) {
    if (ele.attribs.href.indexOf(aimDate) >= 0) {
      matchLinks.push(ele.attribs.href.split(`${aimDate}/`)[1].split('/')[0]);
    }
  });

  // 表 = 上半場
  // 裏 = 下半場
  const result = [];
  let inningsNow;
  let halfsNow;
  let apiHomeTeamCount = 0;
  let apiAwayTeamCount = 0;
  for (let i = 0; i < matchState.length; i++) {
    if (i % 2 === 0) {
      continue;
    }
    if (matchState[i].indexOf('表') === -1 && matchState[i].indexOf('裏') === -1) {
      // 表示未開賽
      inningsNow = 0;
      halfsNow = '0';
    } else if (matchState[i].indexOf('表') >= 0) {
      // x回表
      inningsNow = matchState[i].split('回')[0];
      halfsNow = '0';
    } else if (matchState[i].indexOf('裏') >= 0) {
      // x回裏
      inningsNow = matchState[i].split('回')[0];
      halfsNow = '1';
    }
    result[apiHomeTeamCount] = {
      apiMatchID: matchLinks[apiHomeTeamCount],
      apiHomeID: NPB_teamName2id(apiHomeTeam[apiHomeTeamCount]),
      apiAwayID: NPB_teamName2id(apiAwayTeam[apiAwayTeamCount]),
      inningsNow: inningsNow,
      halfsNow: halfsNow,
      aimDate: aimDate
    };
    apiHomeTeamCount = apiHomeTeamCount + 1;
    apiAwayTeamCount = apiAwayTeamCount + 1;
  }

  return result;
}

async function NPBpbpInplay(path, totalData, inningsInfo, aimYear) {
  const sqlHomeID = totalData.home_id;
  const sqlAwayID = totalData.away_id;
  const sqlMatchID = totalData.bets_id;
  let apiMatchID;
  let aimDate;
  let inningsNow;
  let halfsNow;
  for (let i = 0; i < inningsInfo.length; i++) {
    if (sqlHomeID === inningsInfo[i].apiHomeID && sqlAwayID === inningsInfo[i].apiAwayID) {
      apiMatchID = inningsInfo[i].apiMatchID;
      aimDate = inningsInfo[i].aimDate;
      inningsNow = inningsInfo[i].inningsNow;
      halfsNow = inningsInfo[i].halfsNow;
      break;
    }
  }
  const URL = `https://npb.jp/scores/${aimYear}/${aimDate}/${apiMatchID}`;
  const data = await crawler(URL);
  const awayScore = [];
  const homeScore = [];
  let matahStatus = 1;
  // 比賽狀態
  data('.game_info').each(function() {
    const status = data(this).text();
    if (status.indexOf('試合終了') >= 0) {
      matahStatus = 0;
    } else {
      matahStatus = 1;
    }
  });
  // 比分
  data('.top').each(function() {
    let temp = data(this).text().replace(/\r/g, '');
    temp = temp.replace(/\n/g, '');
    temp = temp.replace(/\t/g, ' ');
    temp = temp.split(' ');
    for (let i = 0; i < temp.length; i++) {
      if (temp[i] === '') {
        continue;
      } else {
        awayScore.push(temp[i].trim());
      }
    }
  });
  data('.bottom').each(function() {
    let temp = data(this).text().replace(/\r/g, '');
    temp = temp.replace(/\n/g, '');
    temp = temp.replace(/\t/g, ' ');
    temp = temp.split(' ');
    for (let i = 0; i < temp.length; i++) {
      if (temp[i] === '') {
        continue;
      } else {
        homeScore.push(temp[i].trim());
      }
    }
  });
  // 13
  // awayScore 0 = > 隊名, 分數 => 1~9(1~13-3), RHE 10~12 (13-3~12)
  set2realtime(`${path}/Now_innings`, inningsNow);
  set2realtime(`${path}/Now_halfs`, String(halfsNow));
  for (let i = 1; i < homeScore.length - 3; i++) {
    set2realtime(`${path}/info/home/Innings${i}/scoring/runs`, homeScore[i]);
  }
  for (let i = 1; i < awayScore.length - 3; i++) {
    set2realtime(`${path}/info/away/Innings${i}/scoring/runs`, awayScore[i]);
  }
  set2realtime(`${path}/info/home/Total`, {
    points: homeScore[homeScore.length - 3],
    hits: homeScore[homeScore.length - 2],
    errors: homeScore[homeScore.length - 1]
  });
  set2realtime(`${path}/info/away/Total`, {
    points: awayScore[awayScore.length - 3],
    hits: awayScore[awayScore.length - 2],
    errors: awayScore[awayScore.length - 1]
  });
  if (matahStatus === 0) {
    // 賽事已結束
    set2realtime(`${path}/status`, 'closed');
    await mysql.Match.upsert({
      bets_id: sqlMatchID,
      home_points: homeScore[homeScore.length - 3],
      away_points: awayScore[awayScore.length - 3],
      status: 0
    });
  }
}

module.exports = main;
