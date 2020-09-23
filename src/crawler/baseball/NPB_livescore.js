const configs = require('../../configs/league/NPB_configs');
// const momentUtil = require('../../helpers/momentUtil');
const { crawler } = require('../../helpers/invokeUtil');
// const { NPB_teamName2id } = require('../../helpers/teamsMapping');
const mysql = require('../../helpers/mysqlUtil');
const { MATCH_STATUS } = require('../../helpers/statusUtil');
const { set2realtime } = require('../../helpers/firebaseUtil');

async function main() {
  const { league, league_id, sport } = configs;
  const nowTime = Date.now();
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
            await NPBpbpInplay(totalData[i], inningsInfo);
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
        await NPBpbpInplay(totalData[i], inningsInfo);
        break;
      }
      default: {
      }
    }
  }
  console.log('NPB_livescore success');
}

async function queryForEvents(leagueID, nowTime) {
  try {
    const queries = await mysql.sequelize.query(
        `
				 SELECT game.bets_id AS bets_id, game.scheduled AS scheduled, game.status AS status, game.league_id AS league_id, game.home_id AS home_id, game.away_id AS away_id
					 FROM matches AS game
					WHERE (game.status = ${MATCH_STATUS.SCHEDULED} OR game.status = ${MATCH_STATUS.INPLAY})
						AND game.league_id = ${leagueID}
						AND game.scheduled*1000 BETWEEN ${nowTime}-86400000 AND ${nowTime}
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

  const apiHomeTeam = [];
  const apiAwayTeam = [];
  const matchState = [];
  data('.score_table_wrap .team1 img').each(function(index) {
    apiHomeTeam.push(data(this).attr('src'));
  });
  data('.score_table_wrap .team2 img').each(function(index) {
    apiAwayTeam.push(data(this).attr('src'));
  });
  data('.score_table_wrap .state').each(function(index) {
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

  // 表 = 上半場
  // 裏 = 下半場
  const result = [];
  let inningsNow;
  let halfsNow;
  for (let i = 0; i < apiHomeTeam.length; i++) {
    if (matchState[i].indexOf('表') === -1 || matchState[i].indexOf('裏') === -1) {
      // 表示未開賽
    } else if (matchState[i].indexOf('表') >= 0) {
      // x回表
      inningsNow = matchState[i].split('回')[0];
      halfsNow = '0';
    } else if (matchState[i].indexOf('裏') >= 0) {
      // x回裏
      inningsNow = matchState[i].split('回')[0];
      halfsNow = '1';
    }
    result[i] = {
      api_home_id: apiHomeTeam[i],
      api_away_id: apiAwayTeam[i],
      Now_innings: inningsNow,
      Now_halfs: halfsNow
    };
  }
  return result;
}

async function NPBpbpInplay(totalData) {
  // const sqlHomeID = totalData.home_id;
  // const sqlAwayID = totalData.away_id;
}
module.exports = main;
