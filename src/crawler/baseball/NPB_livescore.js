const configs = require('../../configs/league/NPB_configs');
// const momentUtil = require('../../helpers/momentUtil');
const { crawler } = require('../../helpers/invokeUtil');
// const { NPB_teamName2id } = require('../../helpers/teamsMapping');
const mysql = require('../../helpers/mysqlUtil');
const { MATCH_STATUS } = require('../../helpers/statusUtil');
const { set2realtime } = require('../../helpers/firebaseUtil');

async function main() {
  const { league, league_id, sport } = configs;
  const totalData = await queryForEvents(league_id);
  for (let i = 0; i < totalData.length; i++) {
    const betsID = totalData[i].bets_id;
    const gameTime = totalData[i].scheduled * 1000;
    const nowTime = Date.now();
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
            await NPBpbpInplay(totalData[i]);
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
        await NPBpbpInplay(totalData[i]);
        break;
      }
      default: {
      }
    }
  }
}

async function queryForEvents(leagueID) {
  try {
    const queries = await mysql.sequelize.query(
        `
				 SELECT game.bets_id AS bets_id, game.scheduled AS scheduled, game.status AS status, game.league_id AS league_id, game.home_id AS home_id, game.away_id AS away_id
					 FROM matches AS game
					WHERE (game.status = ${MATCH_STATUS.SCHEDULED} OR game.status = ${MATCH_STATUS.INPLAY})
						AND game.league_id = ${leagueID}
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

async function NPBpbpInplay(totalData) {
  // const sqlHomeID = totalData.home_id;
  // const sqlAwayID = totalData.away_id;
  const URL = 'https://npb.jp/games/2020/';
  const data = await crawler(URL);
  data('.wrap .team1 img').each(function(index) {
    console.log(data(this).attr('src'));
  });
}
module.exports = main;
