const configs = require('../../configs/league/CPBL_configs');
const momentUtil = require('../../helpers/momentUtil');
const { crawler } = require('../../helpers/invokeUtil');
// const { CPBL_teamName2id } = require('../../helpers/teamsMapping');
const mysql = require('../../helpers/mysqlUtil');
const { MATCH_STATUS } = require('../../helpers/statusUtil');
const { set2realtime } = require('../../helpers/firebaseUtil');

async function main() {
  const { league, league_id, sport } = configs;
  const nowTime = Date.now();
  const date = momentUtil.timestamp2date(nowTime, { op: 'add', value: 0, unit: 'days', format: 'YYYY-MM-DD' });
  const totalData = await queryForEvents(league_id, nowTime);

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
            await CPBLpbpInplay(path, totalData[i], date);
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
        await CPBLpbpInplay(path, totalData[i], date);
        break;
      }
      default: {
      }
    }
  }

  console.log('CPBL_livescore success');
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

async function CPBLpbpInplay(path, totalData, date) {
  const betsID = totalData.bets_id;
  const aimYear = date.split('-')[0];
  const URL = `http://www.cpbl.com.tw/games/play_by_play.html?&game_type=01&game_id=${betsID.split('G')[1]}&game_date=${date}&pbyear=${aimYear}`;

  const data = await crawler(URL);
  const scoreTable = [];
  data('.score_table td').each(function() {
    let temp = data(this).text().replace(/\r/g, '');
    temp = temp.replace(/\n/g, '');
    temp = temp.replace(/\t/g, ' ');
    temp = temp.split(' ');
    for (let i = 0; i < temp.length; i++) {
      if (temp[i] === '') {
        continue;
      } else {
        scoreTable.push(temp[i].trim());
      }
    }
  });
  let matahStatus;
  data('.vs_final').each(function() {
    matahStatus = data(this).text();
  });
  const awayScore = [];
  const homeScore = [];
  // 最初兩個為隊名、最後六個為RHE、(length-2-6)/2 等於局數
  for (let i = 2; i < ((scoreTable.length - 6) / 2) + 1; i++) {
    // 客隊成績
    if (scoreTable[i] === '') {
      scoreTable[i] = 'X';
    }
    awayScore.push(scoreTable[i]);
  }
  for (let i = ((scoreTable.length - 6) / 2) + 1; i < (scoreTable.length - 6); i++) {
    // 主隊成績
    if (scoreTable[i] === '') {
      scoreTable[i] = 'X';
    }
    homeScore.push(scoreTable[i]);
  }
  let inningsNow;
  let halfsNow;
  for (let i = 0; i < awayScore.length; i++) {
    if (awayScore[i] !== '' && homeScore[i] === '') {
      // 現在為 i + 1 局上半
      inningsNow = i + 1;
      halfsNow = '0';
    } else if (awayScore[i] !== '' && homeScore[i] !== '') {
      // 現在為 i + 1 局下半
      inningsNow = i + 1;
      halfsNow = '1';
    } else if (awayScore[i] === '' && homeScore[i] === '') {
      break;
    }
  }
  set2realtime(`${path}/Now_innings`, inningsNow);
  set2realtime(`${path}/Now_halfs`, String(halfsNow));
  for (let i = 0; i < homeScore.length; i++) {
    set2realtime(`${path}/info/home/Innings${i + 1}/scoring/runs`, homeScore[i]);
  }
  for (let i = 0; i < awayScore.length; i++) {
    set2realtime(`${path}/info/away/Innings${i + 1}/scoring/runs`, awayScore[i]);
  }
  set2realtime(`${path}/info/away/Total`, {
    points: scoreTable[scoreTable.length - 6],
    hits: scoreTable[scoreTable.length - 5],
    errors: scoreTable[scoreTable.length - 4]
  });
  set2realtime(`${path}/info/home/Total`, {
    points: scoreTable[scoreTable.length - 3],
    hits: scoreTable[scoreTable.length - 2],
    errors: scoreTable[scoreTable.length - 1]
  });
  if (matahStatus === 'F') {
    // 賽事已結束
    set2realtime(`${path}/status`, 'closed');
    await mysql.Match.upsert({
      bets_id: '2020092211235G207',
      home_points: scoreTable[scoreTable.length - 3],
      away_points: scoreTable[scoreTable.length - 6],
      status: 0
    });
  }
}

module.exports = main;
