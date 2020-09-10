const axios = require('axios');
const db = require('../../util/dbUtil');
const leagueUtil = require('../../util/leagueUtil');
const acceptLeague = require('../../configs/acceptValues');
const token = db.Token;

async function getToken() {
  const URL = 'https://ag.hw8888.net/api/zh-Hant/jwt/login';
  const { data } = await axios(
    {
      method: 'post',
      url: URL,
      data: {
        l_no: process.env.hw_no,
        l_pwd: process.env.hw_pwd
      }
    }
  );

  await token.upsert({
    name: 'hant',
    token: data.result.token
  });
  console.log('Get HW Token success');
}
async function test() {
  // console.log(acceptLeague);
  console.log(new Date());
}
async function getHandicap() {
// 美國時間
  const token = await queryForToken();
  const URL = 'https://ag.hw6666.net/api/zh-Hant/game/game-list?act=normal&ball=1&multi=N&time_interval=today&start=0&occupy=1&count_date=&page=1&count=500';
  const { data } = await axios(
    {
      method: 'get',
      url: URL,
      headers: { Authorization: `Bearer ${token[0].token}` }

    }
  );
  // const timeTolerance = 3600; // 時間誤差在一個小時內
  for (let i = 0; i < acceptLeague.acceptLeague.length; i++) {
    // for -> 開放聯盟
    const leagueId = leagueUtil.leagueCodebook(acceptLeague.acceptLeague[i]).id;
    // ------ 目前僅更新賽前盤 ------- //
    const ele = await queryForMatches(leagueId);
    // -------------------------- //
    for (let j = 0; j < ele.length; j++) {
      // for -> SQL 中有的賽事
      for (let k = 0; k < data.result.data_list.length; k++) {
        // for -> API 中的賽事
        if (
          data.result.data_list[i].roll === '滾球場' && data.result.data_list[i].transType === '全場'
        ) {
          // here
        }
      }
    }
  }

  for (let i = 0; i < data.result.data_list.length; i++) {
    if (data.result.data_list[i].roll === '滾球場' && data.result.data_list[i].transType === '全場') {
      // game_time
      // gsn
      // gameSN
      // visit_A_compensate 客隊讓分賠率
      // main_A_compensate 主隊讓分賠率
      // visit_bs_compensate 客隊大小分賠率
      // main_bs_compensate 主隊大小分賠率
      // main_team 主隊名稱
      // visit_team 客隊名稱
      // A_proffer_status Y = 主讓客, N = 客讓主
      // bs_status
      // proffer_one_A 讓分 handicap
      // proffer_two_A 讓分 rate
      // proffer_one_bs 大小分 handicap
      // proffer_two_bs 大小分 rate
    }
  }
  console.log('Get Handicap success');
}

async function queryForToken() {
  return new Promise(async function(resolve, reject) {
    try {
      const queries = await db.sequelize.query(
        // take 169 ms
        `(
					SELECT token
					  FROM tokens
					 WHERE tokens.name='hant'
				)`,
        {
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      return resolve(queries);
    } catch (err) {
      return reject(`${err.stack} by DY`);
    }
  });
}

async function queryForMatches(leagueId) {
  return new Promise(async function(resolve, reject) {
    try {
      const queries = await db.sequelize.query(
        // take 169 ms
        `(
				 SELECT game.bets_id as id, game.scheduled as scheduled, home.name as home_name, away.name as away_name
					 FROM matches as game,
						    match__teams as home,
							  match__teams as away
					WHERE game.league_id = '${leagueId}'
						AND game.status = '${leagueUtil.MATCH_STATUS.SCHEDULED}'
						AND game.radar_id IS NULL
				  	AND home.team_id = game.home_id
				  	AND away.team_id = game.away_id
				)`,
        {
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      return resolve(queries);
    } catch (err) {
      return reject(`${err.stack} by DY`);
    }
  });
}

module.exports = { getToken, getHandicap, test };
