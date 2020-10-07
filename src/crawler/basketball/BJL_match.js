// const moment = require('moment');
// require('moment-timezone');
// const momentUtil = require('../../helpers/momentUtil');
// const { crawler } = require('../../helpers/invokeUtil');
// const { BJL_teamName2id } = require('../../helpers/teamsMapping');
// const mysql = require('../../helpers/mysqlUtil');
// const configs = require('../../configs/league/BJL_configs');
// const { MATCH_STATUS } = require('../../helpers/statusUtil');
// const { zone_tw } = process.env;

async function main() {
  try {
    // const { season, league, sport, league_id, sport_id, ori_league_id } = configs;
    // const URL = 'https://bleague-ticket.psrv.jp/#d=20201009';
    // const data = await crawler(URL);
    // const result = [];
    // data('.buy').each(function(ele) {
    //  console.log(ele.attr.href);
    // });
    /// // html/body/div[1]/div/div/div/div[4]/div/div/div/div/div[2]/div/div/div/table/tbody/tr[2]/td[1]
    // console.log('123');
    // console.log(result);
  } catch (err) {
    return Promise.reject(err);
  }
}

// function logResult(league, matchId, homeId, awayId) {
//  console.log(`更新 ${league}: ${matchId} - ${homeId} vs ${awayId} 成功`);
// }

module.exports = main;
