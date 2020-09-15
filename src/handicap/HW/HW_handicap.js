const moment = require('moment');
require('moment-timezone');
const axios = require('axios');
const db = require('../../helpers/mysqlUtil');
const leagueUtil = require('../../helpers/leaguesUtil');
const acceptLeague = require('../../configs/acceptValues');
const Token = db.Token;
const Match = db.Match;
const Spread = db.Spread;
const Totals = db.Totals;
const { zone_tw } = process.env;
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

  await Token.upsert({
    name: 'hant',
    token: data.result.token
  });
  console.log('Get HW Token success');
}

async function getHandicap() {
// 美國時間
  let token = await queryForToken();
  const timeTolerance = 3600000; // 時間誤差在一個小時內
  for (let i = 0; i < acceptLeague.acceptLeague.length; i++) {
    // for -> 開放聯盟
    const leagueId = leagueUtil.leagueCodebook(acceptLeague.acceptLeague[i]).id;
    const hw_ball = leagueUtil.leagueCodebook(acceptLeague.acceptLeague[i]).hw_ball;
    if (hw_ball === '') {
      continue;
    }
    let data;
    try {
      const URL = `https://ag.hw6666.net/api/zh-Hant/game/game-list?act=normal&ball=${hw_ball}&multi=N&time_interval=today&start=0&occupy=1&count_date=&page=1&count=500`;
      data = await axios(
        {
          method: 'get',
          url: URL,
          headers: { Authorization: `Bearer ${token[0].token}` }

        }
      );
    } catch (err) {
      await getToken();
      token = await queryForToken();
      const URL = `https://ag.hw6666.net/api/zh-Hant/game/game-list?act=normal&ball=${hw_ball}&multi=N&time_interval=today&start=0&occupy=1&count_date=&page=1&count=500`;
      data = await axios(
        {
          method: 'get',
          url: URL,
          headers: { Authorization: `Bearer ${token[0].token}` }

        }
      );
    }
    data = data.data;
    // ------ 目前僅更新賽前盤 ------- //
    const ele = await queryForMatches(leagueId);
    // -------------------------- //
    for (let j = 0; j < ele.length; j++) {
      // for -> SQL 中有的賽事
      const sqlTime = ele[j].scheduled * 1000;
      const sqlHomeId = ele[j].home_id;
      const sqlAwayId = ele[j].away_id;
      for (let k = 0; k < data.result.data_list.length; k++) {
        // for -> API 中的賽事
        const apiTime = moment.tz(data.result.data_list[k].game_time, zone_tw).unix() * 1000;
        const apiHomeId = leagueName2Id(data.result.data_list[k].main_team);
        const apiAwayId = leagueName2Id(data.result.data_list[k].visit_team);
        if (
          data.result.data_list[k].roll === '滾球場' &&
					data.result.data_list[k].transType === '全場' &&
					sqlTime <= apiTime + timeTolerance &&
					sqlTime >= apiTime - timeTolerance &&
					sqlHomeId === apiHomeId &&
					sqlAwayId === apiAwayId
        ) {
          // match 到場次 檢查盤口是否有更新
          const sqlSpreadStatus = ele[j].spreads_handicap >= 0 ? '1' : '2';
          const sqlSpreadHandicap = ele[j].spreads_handicap;
          const sqlSpreadRate = (ele[j].spreads_rate);
          const sqlTotalsHandicap = ele[j].totals_handicap;
          const sqlTotalsRate = (ele[j].totals_rate);

          const apiSpreadStatus = data.result.data_list[k].proffer_mode;
          const apiSpreadHandicap = data.result.data_list[k].proffer_one_A === 'PK' ? 0 : apiSpreadStatus === '1' ? parseFloat(data.result.data_list[k].proffer_one_A) : -parseFloat(data.result.data_list[k].proffer_one_A);
          const apiSpreadRate = String(data.result.data_list[k].proffer_two_A) === '平' || String(data.result.data_list[k].proffer_two_A) === '' ? 0 : parseFloat(data.result.data_list[k].proffer_two_A);
          const apiTotalsHandicap = data.result.data_list[k].proffer_one_bs;
          const apiTotalsRate = String(data.result.data_list[k].proffer_two_bs) === '平' || String(data.result.data_list[k].proffer_two_bs) === '' ? 0 : parseFloat(data.result.data_list[k].proffer_two_bs);
          const apiSpreadTw = String(data.result.data_list[k].proffer_two_A) === '平' ? `${Math.abs(apiSpreadHandicap)}平` : apiSpreadHandicap === 0 && apiSpreadRate === 0 ? 0 : `${Math.abs(apiSpreadHandicap)}${String(data.result.data_list[k].proffer_two_A)}`;
          const apiTotalsTw = String(data.result.data_list[k].proffer_two_bs) === '平' ? `${Math.abs(apiTotalsHandicap)}平` : apiTotalsHandicap === 0 && apiTotalsRate === 0 ? 0 : `${Math.abs(apiTotalsHandicap)}${String(data.result.data_list[k].proffer_two_bs)}`;

          if (
            sqlSpreadStatus === apiSpreadStatus && // 讓分方
						sqlSpreadHandicap === apiSpreadHandicap && // 讓分盤口
						sqlSpreadRate === apiSpreadRate // 讓分 rate
          ) {
            // 讓分盤口無變化
            console.log(ele[j].bets_id + ' spread is the same');
          } else {
            const time = Date.now();
            Match.upsert({
              bets_id: ele[j].bets_id,
              spread_id: `${data.result.data_list[k].gsn}${time}1`
            });
            Spread.upsert({
              spread_id: `${data.result.data_list[k].gsn}${time}1`,
              match_id: ele[j].bets_id,
              league_id: ele[j].league_id,
              handicap: apiSpreadHandicap,
              rate: apiSpreadRate,
              home_odd: data.result.data_list[k].visit_A_compensate,
              away_odd: data.result.data_list[k].main_A_compensate,
              home_tw: apiSpreadStatus === '1' ? apiSpreadTw : null,
              away_tw: apiSpreadStatus === '2' ? apiSpreadTw : null,
              add_time: time
            });
          }
          if (
            sqlTotalsHandicap === apiTotalsHandicap && // 大小分盤口
						sqlTotalsRate === apiTotalsRate // 大小分 rate
          ) {
            // 大小分盤口無變化
            console.log(ele[j].bets_id + ' total is the same');
          } else {
            const time = Date.now();
            Match.upsert({
              bets_id: ele[j].bets_id,
              totals_id: `${data.result.data_list[k].gsn}${time}2`
            });
            Totals.upsert({
              totals_id: `${data.result.data_list[k].gsn}${time}2`,
              match_id: ele[j].bets_id,
              league_id: ele[j].league_id,
              handicap: apiTotalsHandicap,
              rate: apiTotalsRate,
              over_odd: data.result.data_list[k].visit_bs_compensate,
              under_odd: data.result.data_list[k].main_bs_compensate,
              over_tw: apiTotalsTw,
              add_time: time
            });
          }
          break;
        }
      }
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
					SELECT game.bets_id AS bets_id, game.scheduled AS scheduled, game.home_id AS home_id, game.away_id AS away_id, game.league_id AS league_id,
					       spreads.handicap AS spreads_handicap, spreads.rate AS spreads_rate,
					       totals.handicap AS totals_handicap, totals.rate AS totals_rate
						FROM matches AS game
			 LEFT JOIN match__spreads AS spreads ON game.spread_id = spreads.spread_id
			 LEFT JOIN match__totals AS totals ON game.totals_id = totals.totals_id
					 WHERE game.league_id = '${leagueId}'
					   AND game.status = '${leagueUtil.MATCH_STATUS.SCHEDULED}'			
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

function leagueName2Id(leagueName) {
  let name = leagueName.split('G')[0];
  name = name.split('-')[0];
  switch (name) {
    // MLB
    case '明尼蘇達雙城': {
      return '1088';
    }
    case '多倫多藍鳥': {
      return '1089';
    }
    case '洛杉磯天使': {
      return '1090';
    }
    case '底特律老虎': {
      return '1091';
    }
    case '聖地牙哥教士': {
      return '1108';
    }
    case '邁阿密馬林魚': {
      return '1109';
    }
    case '費城費城人': {
      return '1112';
    }
    case '紐約大都會': {
      return '1113';
    }
    case '巴爾的摩金鶯': {
      return '1120';
    }
    case '紐約洋基': {
      return '1121';
    }
    case '科羅拉多落磯山': {
      return '1146';
    }
    case '華盛頓國民': {
      return '1147';
    }
    case '匹茲堡海盜': {
      return '1186';
    }
    case '密爾瓦基釀酒人': {
      return '1187';
    }
    case '西雅圖水手': {
      return '1202';
    }
    case '芝加哥白襪': {
      return '1203';
    }
    case '坦帕灣光芒': {
      return '1216';
    }
    case '休士頓太空人': {
      return '1217';
    }
    case '奧克蘭運動家': {
      return '1222';
    }
    case '聖路易紅雀': {
      return '1223';
    }
    case '克里夫蘭印地安人': {
      return '1310';
    }
    case '德州遊騎兵': {
      return '1311';
    }
    case '亞特蘭大勇士': {
      return '1352';
    }
    case '舊金山巨人': {
      return '1353';
    }
    case '辛辛那堤紅人': {
      return '1364';
    }
    case '亞利桑那響尾蛇': {
      return '1365';
    }
    case '芝加哥小熊': {
      return '1368';
    }
    case '洛杉磯道奇': {
      return '1369';
    }
    case '堪薩斯皇家': {
      return '1478';
    }
    case '波士頓紅襪': {
      return '1479';
    }
    // NPB
    case '福岡軟銀鷹': {
      return '2386';
    }
    case '西武獅': {
      return '2387';
    }
    case '橫濱DeNA灣星': {
      return '3323';
    }
    case '中日龍': {
      return '3318';
    }
    case '千葉羅德': {
      return '6650';
    }
    case '歐力士猛牛': {
      return '8025';
    }
    case '阪神虎': {
      return '3317';
    }
    case '廣島鯉魚': {
      return '3324';
    }
    case '東北樂天鷹': {
      return '5438';
    }
    case '日本火腿': {
      return '10078';
    }
    case '讀賣巨人': {
      return '45295';
    }
    case '養樂多燕子': {
      return '10216';
    }
    // KBO
    case '華老鷹': {
      return '2405';
    }
    case '飛龍': {
      return '8043';
    }
    case '起亞老虎': {
      return '4202';
    }
    case '鬥山熊': {
      return '2406';
    }
    case '雙子': {
      return '2407';
    }
    case '英雄': {
      return '269103';
    }
    case '樂天巨人': {
      return '2408';
    }
    case '三星獅子': {
      return '3356';
    }
    case '恐龍': {
      return '3353';
    }
    case '巫師': {
      return '3354';
    }
    // CPBL
    case '富邦悍將': {
      return '224094';
    }
    case '樂天桃猿': {
      return '329121';
    }
    case '統一獅': {
      return '224095';
    }
    case '中信兄弟': {
      return '230422';
    }
    // NBA
    case '洛杉磯快艇': {
      return '53389';
    }
    case '丹佛金塊': {
      return '54378';
    }
    case '多倫多暴龍': {
      return '53768';
    }
    case '波士頓塞爾蒂克': {
      return '56280';
    }
    case '密爾瓦基公鹿': {
      return '52913';
    }
    case '奧克拉荷馬雷霆': {
      return '52891';
    }
    case '休士頓火箭': {
      return '52640';
    }
    case '猶他爵士': {
      return '55289';
    }
    case '布魯克林籃網': {
      return '54759';
    }
    case '奧蘭多魔術': {
      return '56088';
    }
    case '華盛頓巫師': {
      return '53953';
    }
    case '鳳凰城太陽': {
      return '56107';
    }
    case '波特蘭拓荒者': {
      return '55868';
    }
    case '曼斐斯灰熊': {
      return '58056';
    }
    case '聖安東尼奧馬刺': {
      return '56087';
    }
    case '沙加緬度國王': {
      return '55290';
    }
    case '達拉斯獨行俠': {
      return '58479';
    }
    case '邁阿密熱火': {
      return '57721';
    }
    case '紐奧良鵜鶘': {
      return '54878';
    }
    case '費城76人': {
      return '53954';
    }
    case '印第安納溜馬': {
      return '54763';
    }
    case '洛杉磯湖人': {
      return '54379';
    }
    case '克里夫蘭騎士': {
      return '55277';
    }
    case '芝加哥公牛': {
      return '52914';
    }
    case '金州勇士': {
      return '53390';
    }
    case '底特律活塞': {
      return '56737';
    }
    case '夏洛特黃蜂': {
      return '58265';
    }
    case '明尼蘇達灰狼': {
      return '58057';
    }
    case '紐約尼克': {
      return '54760';
    }
    case '亞特蘭大老鷹': {
      return '55278';
    }
    // NHL 剩 7 組
    case '紐約島人': {
      return '52379';
    }
    case '坦帕灣閃電': {
      return '56281';
    }
    case '卡羅萊納颶風': {
      return '50631';
    }
    case '紐約游騎兵': {
      return '51831';
    }
    case '埃德蒙頓油工': {
      return '51659';
    }
    case '芝加哥黑鷹': {
      return '51657';
    }
    case '佛羅里達美洲豹': {
      return '54761';
    }
    case '匹茲堡企鵝': {
      return '51656';
    }
    case '蒙特利爾加拿大人': {
      return '51102';
    }
    case '卡爾加里火焰': {
      return '52041';
    }
    case '溫尼伯噴氣機': {
      return '52642';
    }
    case '納什維爾掠奪者': {
      return '51832';
    }
    case '亞利桑那土狼': {
      return '52936';
    }
    case '波士頓棕熊': {
      return '50630';
    }
    case '費城飛人': {
      return '52910';
    }
    case '科羅拉多雪崩': {
      return '51106';
    }
    case '聖路易斯藍調': {
      return '52911';
    }
    case '多倫多楓葉': {
      return '52637';
    }
    case '哥倫布藍衣': {
      return '50629';
    }
    case '溫哥華加人': {
      return '51660';
    }
    case '明尼蘇達荒野': {
      return '51107';
    }
    case '華盛頓首都': {
      return '50632';
    }
    case '維加斯黃金騎士': {
      return '182221';
    }
    case '達拉斯星': {
      return '51658';
    }

    // 中超
    case '石家莊永昌': {
      return '49388';
    }
    case '武漢卓爾': {
      return '6843';
    }
    case '重慶當代力帆': {
      return '9570';
    }
    case '河北華夏幸福': {
      return '11288';
    }
    case '江蘇蘇寧': {
      return '43805';
    }
    case '山東魯能泰山': {
      return '11376';
    }
    case '大連人': {
      return '6833';
    }
    case '河南建業': {
      return '11283';
    }
    case '北京中赫國安': {
      return '9569';
    }
    case '青島黄海青港': {
      return '5722';
    }
    case '上海上港': {
      return '9568';
    }
    case '天津泰達': {
      return '11282';
    }
    case '深圳佳兆業': {
      return '5723';
    }
    case '廣州恒大': {
      return '11289';
    }
    case '上海綠地申花': {
      return '43807';
    }
    case '廣州富力': {
      return '43806';
    }

    // 英超 剩 8 組
    case '富勒姆': {
      return '17170';
    }
    case '阿仙奴': {
      return '17230';
    }
    case '水晶宮': {
      return '17189';
    }
    case '修咸頓': {
      return '17231';
    }
    case '利物浦': {
      return '23451';
    }
    case '列斯聯': {
      return '17175';
    }
    case '韋斯咸': {
      return '709';
    }
    case '紐卡斯爾聯': {
      return '23478';
    }
    case '西布朗': {
      return '331';
    }
    case '李斯特城': {
      return '23452';
    }
    case '托特納姆熱刺': {
      return '17212';
    }
    case '愛華頓': {
      return '44249';
    }

    // 法甲
    case '波爾多': {
      return '347';
    }
    case '南特': {
      return '348';
    }
    case '迪安': {
      return '5134';
    }
    case '昂熱': {
      return '27217';
    }
    case '利爾': {
      return '27254';
    }
    case '雷恩': {
      return '44004';
    }
    case '摩納哥': {
      return '1228';
    }
    case '蘭斯': {
      return '9901';
    }
    case '洛里昂': {
      return '27255';
    }
    case '史特拉斯堡': {
      return '44251';
    }
    case '奈梅斯': {
      return '9904';
    }
    case '布雷斯特': {
      return '9924';
    }
    case '梅斯': {
      return '43927';
    }
    case '蒙彼利埃': {
      return '27258';
    }
    case '聖伊天': {
      return '714';
    }
    case '朗斯': {
      return '9899';
    }
    case '巴黎聖日門': {
      return '1229';
    }
    case '馬賽': {
      return '44166';
    }
    case '尼斯': {
      return '44165';
    }
    case '亞眠': {
      return '9919';
    }

    // 西甲 剩 6 組
    case '伊巴': {
      return '4442';
    }
    case '切爾達': {
      return '10268';
    }
    case '格拉納達': {
      return '993';
    }
    case '畢爾巴鄂競技': {
      return '1210';
    }
    case '卡迪斯': {
      return '1384';
    }
    case '奧薩蘇納': {
      return '17164';
    }
    case '艾拉維斯': {
      return '974';
    }
    case '皇家貝迪斯': {
      return '17164';
    }
    case '巴拉多利德': {
      return '1291';
    }
    case '皇家蘇斯達': {
      return '6303';
    }
    case '維拉利爾': {
      return '1374';
    }
    case '韋斯卡': {
      return '1060';
    }
    case '華倫西亞': {
      return '43939';
    }
    case '利雲特': {
      return '1056';
    }

    // 義甲 尚未開打

    // 德甲 尚未開打

    // 荷甲 剩 4 組
    case '海倫維恩': {
      return '29096';
    }
    case '威廉二世': {
      return '23727';
    }
    case '茲沃勒': {
      return '23654';
    }
    case '費耶諾德': {
      return '43767';
    }
    case '特溫特': {
      return '29097';
    }
    case '錫塔德命運': {
      return '44253';
    }
    case '埃門': {
      return '9910';
    }
    case '芬洛': {
      return '9913';
    }
    case '鹿特丹斯巴達': {
      return '43860';
    }
    case '阿賈克斯': {
      return '344';
    }
    case '赫拉克勒斯': {
      return '342';
    }
    case '海牙': {
      return '341';
    }
    case '格羅寧根': {
      return '220';
    }
    case 'PSV埃因霍溫': {
      return '219';
    }
    case '瓦爾維克': {
      return '9917';
    }
    case '維迪斯': {
      return '43996';
    }

    // 葡超 尚未開打

    // 澳足 尚未開打

    // 日甲

    // 韓足
    case '首爾': {
      return '183';
    }
    case '水原三星': {
      return '182';
    }
    case '江原': {
      return '44269';
    }
    case '浦項制鐵': {
      return '10236';
    }
    case '釜山偶像': {
      return '1729';
    }
    case '仁川聯隊': {
      return '44688';
    }
    case '光州': {
      return '43711';
    }
    case '全北現代': {
      return '184';
    }
    case '尚州尚武': {
      return '181';
    }
    case '城南足球俱樂部': {
      return '44689';
    }
    case '蔚山現代': {
      return '43710';
    }
    case '大邱': {
      return '47445';
    }
    // 歐冠杯

    // 歐洲杯

    default: {
      return name;
    }
  }
}
module.exports = { getToken, getHandicap };
