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
const oddsURL = 'https://api.betsapi.com/v2/event/odds';
const envValues = require('../../configs/envValues');

async function getToken() {
  const URL = 'https://ag.hw8888.net/api/zh-Hant/jwt/login';
  const { data } = await axios(
    {
      method: 'post',
      url: URL,
      data: {
        l_no: envValues.hwAccount.no,
        l_pwd: envValues.hwAccount.pwd
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
    const sportId = leagueUtil.league2Sport(acceptLeague.acceptLeague[i]).sport_id;
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
      let hwSpreadFlag = 0;
      let hwTotalsFlag = 0;
      let apiErrorFlag = 0;

      const sqlTime = ele[j].scheduled * 1000;
      const sqlHomeId = ele[j].home_id;
      const sqlAwayId = ele[j].away_id;
      for (let k = 0; k < data.result.data_list.length; k++) {
        // for -> API 中的賽事
        const apiTime = moment.tz(data.result.data_list[k].game_time, zone_tw).unix() * 1000;
        const apiHomeId = leagueName2Id(data.result.data_list[k].main_team);
        const apiAwayId = leagueName2Id(data.result.data_list[k].visit_team);
        if (
          (
            (data.result.data_list[k].roll === '滾球場' && data.result.data_list[k].transType === '全場') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'MLB 美國職棒') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'MLB 美國職棒-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NPB 日本職棒') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NPB 日本職棒-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'CPBL 中華職棒') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'CPBL 中華職棒-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'KBO 韓國職棒') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'KBO 韓國職棒-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NBA 美國職業籃球') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NBA 美國職業籃球-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '英格蘭超級聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '英格蘭超級聯賽-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '法國甲組聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '法國甲組聯賽-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '西班牙甲組聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '西班牙甲組聯賽-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '意大利甲組聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '意大利甲組聯賽-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '荷蘭甲組聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '荷蘭甲組聯賽-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '葡萄牙超級聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '葡萄牙超級聯賽-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '中國超級聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '中國超級聯賽-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '德國甲組聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '德國甲組聯賽-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '日本J1聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '日本J1聯賽-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '韓國K甲組聯賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '韓國K甲組聯賽-季後賽')

          // 比賽名稱尚未確定
          // (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '澳洲職業足球聯賽') ||
          // (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '澳洲職業足球聯賽-季後賽') ||
          // (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '歐冠杯') ||
          // (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '歐冠杯-季後賽') ||
          // (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '歐洲杯') ||
          // (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '歐洲杯-季後賽') ||
          ) &&
					sqlTime <= apiTime + timeTolerance &&
					sqlTime >= apiTime - timeTolerance &&
					sqlHomeId === apiHomeId &&
					sqlAwayId === apiAwayId
        ) {
          // match 到場次 檢查盤口是否有更新
          // for 足球盤口轉換
          let firstHandicap;
          let secondHandicap;
          let spreadTw;
          let totalsTw;
          if (sportId === 1) {
            // 讓分
            if (data.result.data_list[k].proffer_one_A.indexOf('/') >= 0) {
              firstHandicap = data.result.data_list[k].proffer_one_A.split('/')[0];
              secondHandicap = data.result.data_list[k].proffer_one_A.split('/')[1];
              firstHandicap = firstHandicap.replace('平手', '0');
              firstHandicap = firstHandicap.replace('半球', '0.5');
              firstHandicap = firstHandicap.replace('一球', '1');
              firstHandicap = firstHandicap.replace('兩球', '2');
              firstHandicap = firstHandicap.replace('三球', '3');
              firstHandicap = firstHandicap.replace('四球', '4');
              firstHandicap = firstHandicap.replace('五球', '5');
              secondHandicap = secondHandicap.replace('平手', '0');
              secondHandicap = secondHandicap.replace('半球', '0.5');
              secondHandicap = secondHandicap.replace('一球', '1');
              secondHandicap = secondHandicap.replace('兩球', '2');
              secondHandicap = secondHandicap.replace('三球', '3');
              secondHandicap = secondHandicap.replace('四球', '4');
              secondHandicap = secondHandicap.replace('五球', '5');
              firstHandicap = firstHandicap.replace('半', '.5');
              secondHandicap = secondHandicap.replace('半', '.1');
              data.result.data_list[k].proffer_one_A = (parseFloat(firstHandicap) + parseFloat(secondHandicap)) / 2;
              if (String(data.result.data_list[k].proffer_one_A).indexOf('.25')) {
                data.result.data_list[k].proffer_two_A = '-50';
              } else if (String(data.result.data_list[k].proffer_one_A).indexOf('.5')) {
                data.result.data_list[k].proffer_two_A = '-100';
              } else if (String(data.result.data_list[k].proffer_one_A).indexOf('.75')) {
                data.result.data_list[k].proffer_two_A = '50';
              } else {
                data.result.data_list[k].proffer_two_A = '0';
              }
              spreadTw = `${parseFloat(firstHandicap)}/${parseFloat(secondHandicap)}`;
            } else {
              firstHandicap = data.result.data_list[k].proffer_one_A;
              firstHandicap = firstHandicap.replace('平手', '0');
              firstHandicap = firstHandicap.replace('半球', '0.5');
              firstHandicap = firstHandicap.replace('一球', '1');
              firstHandicap = firstHandicap.replace('兩球', '2');
              firstHandicap = firstHandicap.replace('三球', '3');
              firstHandicap = firstHandicap.replace('四球', '4');
              firstHandicap = firstHandicap.replace('五球', '5');
              firstHandicap = firstHandicap.replace('半', '.5');
              data.result.data_list[k].proffer_one_A = firstHandicap;
              if (String(data.result.data_list[k].proffer_one_A).indexOf('.25') >= 0) {
                data.result.data_list[k].proffer_two_A = '-50';
              } else if (String(data.result.data_list[k].proffer_one_A).indexOf('.5') >= 0) {
                data.result.data_list[k].proffer_two_A = '-100';
              } else if (String(data.result.data_list[k].proffer_one_A).indexOf('.75') >= 0) {
                data.result.data_list[k].proffer_two_A = '50';
              } else {
                data.result.data_list[k].proffer_two_A = '0';
              }
              spreadTw = `${parseFloat(firstHandicap)}`;
            }
            // 大小分
            if (data.result.data_list[k].proffer_one_bs.indexOf('/') >= 0) {
              firstHandicap = data.result.data_list[k].proffer_one_bs.split('/')[0];
              secondHandicap = data.result.data_list[k].proffer_one_bs.split('/')[1];
              firstHandicap = firstHandicap.replace('平手', '0');
              firstHandicap = firstHandicap.replace('半球', '0.5');
              firstHandicap = firstHandicap.replace('一球', '1');
              firstHandicap = firstHandicap.replace('兩球', '2');
              firstHandicap = firstHandicap.replace('三球', '3');
              firstHandicap = firstHandicap.replace('四球', '4');
              firstHandicap = firstHandicap.replace('五球', '5');
              secondHandicap = secondHandicap.replace('平手', '0');
              secondHandicap = secondHandicap.replace('半球', '0.5');
              secondHandicap = secondHandicap.replace('一球', '1');
              secondHandicap = secondHandicap.replace('兩球', '2');
              secondHandicap = secondHandicap.replace('三球', '3');
              secondHandicap = secondHandicap.replace('四球', '4');
              secondHandicap = secondHandicap.replace('五球', '5');
              firstHandicap = firstHandicap.replace('半', '.5');
              secondHandicap = secondHandicap.replace('半', '.1');
              data.result.data_list[k].proffer_one_bs = (parseFloat(firstHandicap) + parseFloat(secondHandicap)) / 2;
              if (String(data.result.data_list[k].proffer_one_bs).indexOf('.25') >= 0) {
                data.result.data_list[k].proffer_two_bs = '-50';
              } else if (String(data.result.data_list[k].proffer_one_bs).indexOf('.5') >= 0) {
                data.result.data_list[k].proffer_two_bs = '-100';
              } else if (String(data.result.data_list[k].proffer_one_bs).indexOf('.75') >= 0) {
                data.result.data_list[k].proffer_two_bs = '50';
              } else {
                data.result.data_list[k].proffer_two_bs = '0';
              }
              // 兩個盤口
              totalsTw = `${parseFloat(firstHandicap)}/${parseFloat(secondHandicap)}`;
            } else {
              firstHandicap = data.result.data_list[k].proffer_one_bs;
              firstHandicap = firstHandicap.replace('平手', '0');
              firstHandicap = firstHandicap.replace('半球', '0.5');
              firstHandicap = firstHandicap.replace('一球', '1');
              firstHandicap = firstHandicap.replace('兩球', '2');
              firstHandicap = firstHandicap.replace('三球', '3');
              firstHandicap = firstHandicap.replace('四球', '4');
              firstHandicap = firstHandicap.replace('五球', '5');

              if (String(data.result.data_list[k].proffer_one_bs).indexOf('.25') >= 0) {
                data.result.data_list[k].proffer_two_bs = '-50';
              } else if (String(data.result.data_list[k].proffer_one_bs).indexOf('.5') >= 0) {
                data.result.data_list[k].proffer_two_bs = '-100';
              } else if (String(data.result.data_list[k].proffer_one_bs).indexOf('.75') >= 0) {
                data.result.data_list[k].proffer_two_bs = '50';
              } else {
                data.result.data_list[k].proffer_two_bs = '0';
              }
              totalsTw = `${parseFloat(firstHandicap)}`;
            }
          }
          const sqlSpreadStatus = ele[j].spreads_handicap >= 0 ? '1' : '2';
          const sqlSpreadHandicap = ele[j].spreads_handicap;
          const sqlSpreadRate = (ele[j].spreads_rate);
          const sqlTotalsHandicap = ele[j].totals_handicap;
          const sqlTotalsRate = (ele[j].totals_rate);
          let apiSpreadStatus;
          let apiSpreadHandicap;
          let apiSpreadRate;
          let apiTotalsHandicap;
          let apiTotalsRate;
          let apiSpreadTw;
          let apiTotalsTw;
          if (sportId === 1) {
            apiSpreadStatus = data.result.data_list[k].proffer_mode;
            // 需注意讓零分時 盤口會呈現 PK 或讓 0 分
            apiSpreadHandicap = data.result.data_list[k].proffer_one_A === 'PK' || parseFloat(data.result.data_list[k].proffer_one_A) === 0 ? 0 : apiSpreadStatus === '1' ? parseFloat(data.result.data_list[k].proffer_one_A) : -parseFloat(data.result.data_list[k].proffer_one_A);
            apiSpreadRate = parseFloat(data.result.data_list[k].proffer_two_A);
            apiTotalsHandicap = parseFloat(data.result.data_list[k].proffer_one_bs);
            apiTotalsRate = parseFloat(data.result.data_list[k].proffer_two_bs);
            apiSpreadTw = String(spreadTw);
            apiTotalsTw = String(totalsTw);
          } else {
            apiSpreadStatus = data.result.data_list[k].proffer_mode;
            // 需注意讓零分時 盤口會呈現 PK 或讓 0 分
            apiSpreadHandicap = data.result.data_list[k].proffer_one_A === 'PK' || parseFloat(data.result.data_list[k].proffer_one_A) === 0 ? 0 : apiSpreadStatus === '1' ? parseFloat(data.result.data_list[k].proffer_one_A) : -parseFloat(data.result.data_list[k].proffer_one_A);
            apiSpreadRate = String(data.result.data_list[k].proffer_two_A) === '平' || String(data.result.data_list[k].proffer_two_A) === '' ? 0 : parseFloat(data.result.data_list[k].proffer_two_A);
            apiTotalsHandicap = data.result.data_list[k].proffer_one_bs;
            apiTotalsRate = String(data.result.data_list[k].proffer_two_bs) === '平' || String(data.result.data_list[k].proffer_two_bs) === '' ? 0 : parseFloat(data.result.data_list[k].proffer_two_bs);
            apiSpreadTw = String(data.result.data_list[k].proffer_two_A) === '平' ? `${Math.abs(apiSpreadHandicap)}平` : apiSpreadHandicap === 0 && apiSpreadRate === 0 ? 0 : `${Math.abs(apiSpreadHandicap)}${String(data.result.data_list[k].proffer_two_A)}`;
            apiTotalsTw = String(data.result.data_list[k].proffer_two_bs) === '平' ? `${Math.abs(apiTotalsHandicap)}平` : apiTotalsHandicap === 0 && apiTotalsRate === 0 ? 0 : `${Math.abs(apiTotalsHandicap)}${String(data.result.data_list[k].proffer_two_bs)}`;
          }

          if ((apiSpreadHandicap === 0 && apiSpreadRate === 0 && apiTotalsHandicap === 1 && apiTotalsRate === 0) || apiTotalsHandicap === 0) {
            // 讓分 0 rate 0, 大小分 1 rate 0 API 錯誤
            apiErrorFlag = 1;
          }
          if (apiErrorFlag === 0) {
            if (
              sqlSpreadStatus === apiSpreadStatus && // 讓分方
              sqlSpreadHandicap === apiSpreadHandicap && // 讓分盤口
              sqlSpreadRate === apiSpreadRate // 讓分 rate
            ) {
            // 讓分盤口無變化
              hwSpreadFlag = 1;
            } else {
              const time = Date.now();
              try {
                await Match.upsert({
                  bets_id: ele[j].bets_id,
                  spread_id: `${data.result.data_list[k].gsn}${time}1`
                });
              } catch (err) {
                return (`${err.stack} by DY`);
              }
              try {
                await Spread.upsert({
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
              } catch (err) {
                return (`${err.stack} by DY`);
              }
              hwSpreadFlag = 1;
            }
            if (
              sqlTotalsHandicap === apiTotalsHandicap && // 大小分盤口
              sqlTotalsRate === apiTotalsRate // 大小分 rate
            ) {
            // 大小分盤口無變化
              hwTotalsFlag = 1;
            } else {
              const time = Date.now();
              try {
                await Match.upsert({
                  bets_id: ele[j].bets_id,
                  totals_id: `${data.result.data_list[k].gsn}${time}2`
                });
              } catch (err) {
                return (`${err.stack} by DY`);
              }
              try {
                await Totals.upsert({
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
              } catch (err) {
                return (`${err.stack} by DY`);
              }
              hwTotalsFlag = 1;
            }
          }
          break;
        }
      }
      if (hwSpreadFlag === 0 || hwTotalsFlag === 0) {
        getHandicapFromBets(ele[j], ele[j].league_id, sportId, hwSpreadFlag, hwTotalsFlag);
      }
    }
  }

  console.log('Get Handicap success');
}

async function getHandicapFromBets(ele, league, sport, hwSpreadFlag, hwTotalsFlag) {
  const URL = `${oddsURL}?token=${envValues.betsToken}&event_id=${ele.bets_id}&odds_market=2,3`;
  const data = await axiosForURL(URL);
  let spread_odds = [];
  let totals_odds = [];
  if (data.results) {
    if (data.results.odds) {
      if (hwSpreadFlag === 0) {
        if (data.results.odds[`${sport}_2`]) {
          spread_odds = data.results.odds[`${sport}_2`];
        }
        let newest_spread;
        if (spread_odds.length > 0) {
          const spcount = 0;
          if (
            spread_odds[spcount].home_od !== null &&
					spread_odds[spcount].handicap !== null &&
					spread_odds[spcount].away_od !== null &&
					spread_odds[spcount].home_od !== '-' &&
					spread_odds[spcount].away_od !== '-' &&
					spread_odds[spcount].add_time * 1000 <= ele.scheduled * 1000
          ) {
            newest_spread = spread_odds[spcount];
            newest_spread = spreadCalculator(newest_spread, sport, league);
            write2MysqlOfMatchAboutNewestSpread(ele, newest_spread);
            write2MysqlOfMatchSpread(newest_spread, ele, league);
          }
        }
      }
      if (hwTotalsFlag === 0) {
        if (data.results.odds[`${sport}_3`]) {
          totals_odds = data.results.odds[`${sport}_3`];
        }
        let newest_totals;
        if (totals_odds.length > 0) {
          const tocount = 0;
          if (
            totals_odds[tocount].over_od !== null &&
                totals_odds[tocount].handicap !== null &&
                totals_odds[tocount].under_od !== null &&
                totals_odds[tocount].over_od !== '-' &&
                totals_odds[tocount].under_od !== '-' &&
                totals_odds[tocount].add_time * 1000 <= ele.scheduled * 1000
          ) {
            newest_totals = totals_odds[tocount];
            newest_totals = totalsCalculator(newest_totals, sport);
            write2MysqlOfMatchAboutNewestTotals(ele, newest_totals);
            write2MysqlOfMatchTotals(newest_totals, ele, league);
          }
        }
      }
    }
  }
}

function totalsCalculator(handicapObj, sport) {
  handicapObj.handicap = parseFloat(handicapObj.handicap);
  handicapObj.over_odd = parseFloat(handicapObj.over_od);
  handicapObj.under_odd = parseFloat(handicapObj.under_od);
  if (handicapObj.handicap === 0 || handicapObj.handicap !== null) {
    if (sport === 17 || sport === 18) {
      // 籃球或冰球
      if (handicapObj.handicap % 1 === 0) {
        // 整數
        handicapObj.over_tw = `${handicapObj.handicap}平`;
        handicapObj.rate = 0;
      } else {
        // 小數
        handicapObj.over_tw = `${handicapObj.handicap}`;
        handicapObj.rate = -100;
      }
    }
    if (sport === 16) {
      // 棒球

      if (handicapObj.handicap % 1 === 0) {
        // 整數
        if (handicapObj.over_odd !== handicapObj.under_odd) {
          // 賠率不同
          if (handicapObj.over_odd > handicapObj.under_odd) {
            // 大分賠率>小分賠率
            handicapObj.over_tw = `${handicapObj.handicap}+50`;
            handicapObj.rate = 50;
          } else {
            // 小分賠率>大分賠率
            handicapObj.over_tw = `${handicapObj.handicap}-50`;
            handicapObj.rate = -50;
          }
        } else {
          // 賠率相同
          handicapObj.over_tw = `${handicapObj.handicap}平`;
          handicapObj.rate = 0;
        }
      } else {
        // 小數
        if (handicapObj.over_odd !== handicapObj.under_odd) {
          // 賠率不同
          if (handicapObj.over_odd > handicapObj.under_odd) {
            // 大分賠率>小分賠率
            handicapObj.over_tw = `${Math.floor(handicapObj.handicap)}+50`;
            handicapObj.rate = 50;
            handicapObj.handicap = `${Math.floor(
              Math.abs(handicapObj.handicap)
            )}`;
          } else {
            // 小分賠率>大分賠率
            handicapObj.over_tw = `${Math.floor(handicapObj.handicap)}-50`;
            handicapObj.rate = -50;
            handicapObj.handicap = `${Math.floor(
              Math.abs(handicapObj.handicap)
            )}`;
          }
        } else {
          // 賠率相同
          handicapObj.over_tw = `${Math.floor(handicapObj.handicap)}-100`;
          handicapObj.rate = -100;
        }
      }
    }

    if (sport === 1) {
      // 足球
      if (handicapObj.handicap) {
        handicapObj.handicap = handicapObj.handicap.toString();
        if (handicapObj.handicap.indexOf(',') !== -1) {
          const firstHandicap = Math.abs(
            parseFloat(handicapObj.handicap.split(',')[0])
          );
          const secondHandicap = Math.abs(
            parseFloat(handicapObj.handicap.split(',')[1])
          );
          if (firstHandicap % 1 !== 0) {
            // 第一盤口為小數
            handicapObj.over_tw = firstHandicap + '/' + secondHandicap;
            handicapObj.handicap =
              (parseFloat(Math.abs(firstHandicap)) +
                parseFloat(Math.abs(secondHandicap))) /
              2;
            handicapObj.rate = 50;
          } else {
            // 第一盤口為整數
            // 顯示在主隊區
            handicapObj.over_tw = firstHandicap + '/' + secondHandicap;
            handicapObj.handicap =
              (parseFloat(Math.abs(firstHandicap)) +
                parseFloat(Math.abs(secondHandicap))) /
              2;
            handicapObj.rate = -50;
          }
        } else {
          // 盤口只有一個數
          const str = handicapObj.handicap.toString();
          const str1 = str.split('.')[0];
          const str2 = str.split('.')[1];
          if (str2 === '25') {
            handicapObj.over_tw = `${str1}/${str1}.5`;
            handicapObj.rate = -50;
          } else if (str2 === '75') {
            handicapObj.over_tw = `${str1}.5/${parseFloat(str1) + 1}`;
            handicapObj.rate = 50;
          } else {
            handicapObj.over_tw = Math.abs(handicapObj.handicap);
            handicapObj.rate = 0;
          }
        }
      }
    }
  }
  return handicapObj;
}

async function write2MysqlOfMatchSpread(odd, ele, leagueUniteID) {
  return new Promise(async function(resolve, reject) {
    if (
      leagueUniteID === '11235' || // 中華職棒
      leagueUniteID === '347' || // 日本棒球
      leagueUniteID === '349' || // 韓國棒球
			leagueUniteID === '225' ||// 美國棒球
			leagueUniteID === '3939' ||// 美國棒球
			leagueUniteID === '2274' ||// 美國籃球
			leagueUniteID === '244' ||// WNBA
			leagueUniteID === '1926'// 美國冰球
    ) {
      try {
        if (leagueUniteID === '225') {
          leagueUniteID = '3939';
        }
        Spread.upsert({
          spread_id: odd.id,
          match_id: ele.bets_id,
          league_id: leagueUniteID,
          handicap: Number.parseFloat(odd.handicap),
          rate: Number.parseFloat(odd.rate),
          home_odd: Number.parseFloat(odd.away_od),
          away_odd: Number.parseFloat(odd.home_od),
          home_tw: odd.home_tw,
          away_tw: odd.away_tw,
          add_time: Number.parseInt(odd.add_time) * 1000
        });
        return resolve('ok');
      } catch (err) {
        return reject(`${err.stack} by DY`);
      }
    } else {
      try {
        Spread.upsert({
          spread_id: odd.id,
          match_id: ele.bets_id,
          league_id: leagueUniteID,
          handicap: Number.parseFloat(odd.handicap),
          rate: Number.parseFloat(odd.rate),
          home_odd: Number.parseFloat(odd.home_od),
          away_odd: Number.parseFloat(odd.away_od),
          home_tw: odd.home_tw,
          away_tw: odd.away_tw,
          add_time: Number.parseInt(odd.add_time) * 1000
        });
        return resolve('ok');
      } catch (err) {
        return reject(`${err.stack} by DY`);
      }
    }
  });
}
async function write2MysqlOfMatchTotals(odd, ele, leagueUniteID) {
  return new Promise(async function(resolve, reject) {
    try {
      Totals.upsert({
        totals_id: odd.id,
        match_id: ele.bets_id,
        league_id: leagueUniteID,
        handicap: Number.parseFloat(odd.handicap),
        rate: Number.parseFloat(odd.rate),
        over_odd: Number.parseFloat(odd.over_od),
        under_odd: Number.parseFloat(odd.under_od),
        over_tw: odd.over_tw,
        add_time: Number.parseInt(odd.add_time) * 1000
      });
      return resolve('ok');
    } catch (err) {
      return reject(`${err.stack} by DY`);
    }
  });
}

async function write2MysqlOfMatchAboutNewestSpread(ele, newest_spread) {
  return new Promise(async function(resolve, reject) {
    try {
      Match.upsert({
        bets_id: ele.bets_id,
        spread_id: newest_spread.id
      });
      return resolve('ok');
    } catch (err) {
      return reject(`${err.stack} by DY`);
    }
  });
}

async function write2MysqlOfMatchAboutNewestTotals(ele, newest_totals) {
  return new Promise(async function(resolve, reject) {
    try {
      Match.upsert({
        bets_id: ele.bets_id,
        totals_id: newest_totals.id
      });
      return resolve('ok');
    } catch (err) {
      return reject(`${err.stack} by DY`);
    }
  });
}

function modifyHandicap(handicap, upOrDown, unit) {
  const specificTable = ['1+50', 'PK', 'PK', 'PK']; //   ver.2 邏輯
  const pkTable = ['PK', 'PK', 'PK', 'PK'];
  let handicapNow;
  const unitArray = Math.ceil(unit / 4) + 1; // 總共需要幾個unit組合
  const calculateArray = [];
  if (upOrDown === 1) {
    // 往上數
    for (let i = 0; i < unitArray; i++) {
      handicapNow = Math.floor(handicap) - i;
      // add array
      if (handicapNow === 0) {
        // 加特殊情況
        specificTable.forEach((item) => calculateArray.push(item));
      } else if (handicapNow < 0) {
        pkTable.forEach((item) => calculateArray.push(item));
      } else {
        // 加一般陣列
        normalTable(handicapNow, upOrDown).forEach((item) =>
          calculateArray.push(item)
        );
      }
    }
  } else {
    // 往下數
    for (let i = 0; i < unitArray; i++) {
      // add array
      handicapNow = Math.floor(handicap) + i + 1;
      // 加一般陣列
      normalTable(handicapNow, upOrDown).forEach((item) =>
        calculateArray.push(item)
      );
    }
    if (unit !== 0) {
      unit = unit - 1;
    }
  }

  let tempHandicap = calculateArray[unit];

  if (tempHandicap === undefined) {
    tempHandicap = handicap;
  }
  return tempHandicap;
}

function normalTable(handicap, upOrDown) {
  if (upOrDown === 1) {
    return [
      `${Math.floor(handicap)}-100`,
      `${Math.floor(handicap)}-50`,
      `${Math.floor(handicap)}平`,
      `${Math.floor(handicap)}+50`
    ];
  } else {
    return [
      `${Math.floor(handicap)}+50`,
      `${Math.floor(handicap)}平`,
      `${Math.floor(handicap)}-50`,
      `${Math.floor(handicap)}-100`
    ];
  }
}

function spreadCalculator(handicapObj, sport, league) {
  if (handicapObj.handicap === 0 || handicapObj.handicap !== null) {
    if (league === '2319') {
      // 籃球等主客正常的
      handicapObj.handicap = -parseFloat(handicapObj.handicap);
      handicapObj.home_odd = parseFloat(handicapObj.home_od);
      handicapObj.away_odd = parseFloat(handicapObj.away_od);
    } else {
      // 棒球等主客交換的
      handicapObj.handicap = parseFloat(handicapObj.handicap);
      handicapObj.home_odd = parseFloat(handicapObj.away_od);
      handicapObj.away_odd = parseFloat(handicapObj.home_od);
    }

    if (sport === 17 || sport === 18) {
      // 籃球或冰球
      if (handicapObj.handicap % 1 === 0) {
        // 整數盤口
        if (handicapObj.handicap >= 0) {
          // 主讓客
          handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}平`;
          handicapObj.away_tw = null;

          handicapObj.rate = 0;
        } else {
          // 客讓主
          handicapObj.home_tw = null;
          handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}平`;

          handicapObj.rate = 0;
        }
      } else {
        // 小數盤口
        if (handicapObj.handicap >= 0) {
          // 主讓客
          handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}`;
          handicapObj.away_tw = null;

          handicapObj.rate = 0;
        } else {
          // 客讓主
          handicapObj.home_tw = null;
          handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}`;

          handicapObj.rate = 0;
        }
      }
    }

    if (sport === 16) {
      // 棒球
      if (handicapObj.handicap % 1 === 0) {
        // 整數盤口
        if (handicapObj.home_odd !== handicapObj.away_odd) {
          // 不同賠率
          if (handicapObj.handicap >= 0) {
            // 主讓客
            if (handicapObj.home_odd > handicapObj.away_odd) {
              // 主賠率>客賠率 顯示 +
              handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}+50`;
              handicapObj.away_tw = null;
              handicapObj.rate = 50;
            } else {
              // 客賠率>主賠率 顯示 -
              handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}-50`;
              handicapObj.away_tw = null;
              handicapObj.rate = -50;
            }
          } else {
            // 客讓主
            if (handicapObj.home_odd > handicapObj.away_odd) {
              // 主賠率>客賠率 顯示 -
              handicapObj.home_tw = null;
              handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}-50`;
              handicapObj.rate = -50;
            } else {
              // 客賠率>主賠率 顯示 +
              handicapObj.home_tw = null;
              handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}+50`;
              handicapObj.rate = 50;
            }
          }
        } else {
          // 相同賠率
          if (handicapObj.handicap >= 0) {
            // 主讓客
            handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}平`;
            handicapObj.away_tw = null;
            handicapObj.rate = 0;
          } else {
            // 客讓主
            handicapObj.home_tw = null;
            handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}平`;
            handicapObj.rate = 0;
          }
        }
      } else {
        // 小數盤口
        if (handicapObj.handicap > 1 || handicapObj.handicap < -1) {
          if (handicapObj.home_odd !== handicapObj.away_odd) {
            // 不同賠率
            let tempHandicap;
            if (handicapObj.home_odd >= 1.85 && handicapObj.away_odd >= 1.85) {
              // 主/客賠率都大於等於 1.85 時不調整
              if (handicapObj.handicap >= 0) {
                // 主讓客
                if (handicapObj.home_odd > handicapObj.away_odd) {
                  // 主賠率 > 客賠率 顯示 +
                  handicapObj.handicap = `${Math.floor(handicapObj.handicap)}`;
                  handicapObj.home_tw = `${Math.floor(
                    Math.abs(handicapObj.handicap)
                  )}+50`;
                  handicapObj.away_tw = null;
                  handicapObj.rate = 50;
                } else {
                  // 主賠率<客賠率 顯示 -
                  handicapObj.handicap = `${Math.floor(handicapObj.handicap)}`;
                  handicapObj.home_tw = `${Math.floor(
                    Math.abs(handicapObj.handicap)
                  )}-50`;
                  handicapObj.away_tw = null;
                  handicapObj.rate = -50;
                }
              } else {
                // 客讓主
                if (handicapObj.home_odd > handicapObj.away_odd) {
                  // 主賠率>客賠率 顯示 -
                  handicapObj.handicap = `${Math.ceil(handicapObj.handicap)}`;
                  handicapObj.home_tw = null;
                  handicapObj.away_tw = `${Math.floor(
                    Math.abs(handicapObj.handicap)
                  )}-50`;
                  handicapObj.rate = -50;
                } else {
                  // 主賠率<客賠率 顯示 +
                  handicapObj.handicap = `${Math.ceil(handicapObj.handicap)}`;
                  handicapObj.home_tw = null;
                  handicapObj.away_tw = `${Math.floor(
                    Math.abs(handicapObj.handicap)
                  )}+50`;
                  handicapObj.rate = 50;
                }
              }
            } else {
              // 主/客賠率其中一個小於 1.85 時做調整 todo
              if (handicapObj.home_odd > handicapObj.away_odd) {
                // 主賠率>客賠率
                if (handicapObj.handicap > 0) {
                  // 主讓客 = 斜邊 = 往上數
                  tempHandicap = modifyHandicap(
                    Math.abs(handicapObj.handicap),
                    1,
                    Math.round((1.85 - handicapObj.away_odd) / 0.06)
                  );
                } else {
                  // 客讓主 = 同邊 = 往下數
                  tempHandicap = modifyHandicap(
                    Math.abs(handicapObj.handicap),
                    -1,
                    Math.round((1.85 - handicapObj.away_odd) / 0.06)
                  );
                }
              } else {
                // 客賠率>主賠率
                if (handicapObj.handicap >= 0) {
                  // 主讓客 = 同邊 = 往下數
                  tempHandicap = modifyHandicap(
                    Math.abs(handicapObj.handicap),
                    -1,
                    Math.round((1.85 - handicapObj.home_odd) / 0.06)
                  );
                } else {
                  // 客讓主 = 斜邊 = 往上數
                  tempHandicap = modifyHandicap(
                    Math.abs(handicapObj.handicap),
                    1,
                    Math.round((1.85 - handicapObj.home_odd) / 0.06)
                  );
                }
              }

              // here
              if (tempHandicap !== undefined) {
                if (tempHandicap === 'PK') {
                  handicapObj.handicap = 0;
                  handicapObj.rate = 0;
                  handicapObj.home_tw = 'PK';
                  handicapObj.away_tw = null;
                }
                if (handicapObj.handicap >= 0) {
                  // 原本的盤口>=0 主讓客
                  if (tempHandicap[0] === '-') {
                    // 盤口變號 變成客讓主
                    tempHandicap = tempHandicap.replace('-', '');
                    if (tempHandicap.indexOf('-') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `-${tempHandicap.split('-')[0]}`
                      );
                      handicapObj.rate = parseFloat(
                        `-${tempHandicap.split('-')[1]}`
                      );
                    } else if (tempHandicap.indexOf('+') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `-${tempHandicap.split('+')[0]}`
                      );
                      handicapObj.rate = parseFloat(tempHandicap.split('+')[1]);
                    } else if (tempHandicap.indexOf('平') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `-${tempHandicap.split('平')[0]}`
                      );
                      handicapObj.rate = 0;
                    } else if (tempHandicap.indexOf('輸') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `-${tempHandicap.split('輸')[0]}`
                      );
                      handicapObj.rate = -100;
                    }
                    handicapObj.home_tw = null;
                    handicapObj.away_tw = tempHandicap;
                  } else {
                    // 不用變號
                    if (tempHandicap.indexOf('-') !== -1) {
                      handicapObj.handicap = parseFloat(
                        tempHandicap.split('-')[0]
                      );
                      handicapObj.rate = parseFloat(
                        `-${tempHandicap.split('-')[1]}`
                      );
                    } else if (tempHandicap.indexOf('+') !== -1) {
                      handicapObj.handicap = parseFloat(
                        tempHandicap.split('+')[0]
                      );
                      handicapObj.rate = parseFloat(tempHandicap.split('+')[1]);
                    } else if (tempHandicap.indexOf('平') !== -1) {
                      handicapObj.handicap = parseFloat(
                        tempHandicap.split('平')[0]
                      );
                      handicapObj.rate = 0;
                    } else if (tempHandicap.indexOf('輸') !== -1) {
                      handicapObj.handicap = parseFloat(
                        tempHandicap.split('輸')[0]
                      );
                      handicapObj.rate = -100;
                    }
                    handicapObj.home_tw = tempHandicap;
                    handicapObj.away_tw = null;
                  }
                } else {
                  // 原本的盤口<0 客讓主
                  if (tempHandicap[0] === '-') {
                    // 變號 變成主讓客
                    tempHandicap = tempHandicap.replace('-', '');
                    if (tempHandicap.indexOf('-') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `${tempHandicap.split('-')[0]}`
                      );
                      handicapObj.rate = parseFloat(
                        `-${tempHandicap.split('-')[1]}`
                      );
                    } else if (tempHandicap.indexOf('+') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `${tempHandicap.split('+')[0]}`
                      );
                      handicapObj.rate = parseFloat(tempHandicap.split('+')[1]);
                    } else if (tempHandicap.indexOf('平') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `${tempHandicap.split('平')[0]}`
                      );
                      handicapObj.rate = 0;
                    } else if (tempHandicap.indexOf('輸') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `${tempHandicap.split('輸')[0]}`
                      );
                      handicapObj.rate = -100;
                    }
                    handicapObj.home_tw = tempHandicap;
                    handicapObj.away_tw = null;
                  } else {
                    // 不用變號
                    if (tempHandicap.indexOf('-') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `-${tempHandicap.split('-')[0]}`
                      );
                      handicapObj.rate = parseFloat(
                        `-${tempHandicap.split('-')[1]}`
                      );
                    } else if (tempHandicap.indexOf('+') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `-${tempHandicap.split('+')[0]}`
                      );
                      handicapObj.rate = parseFloat(tempHandicap.split('+')[1]);
                    } else if (tempHandicap.indexOf('平') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `-${tempHandicap.split('平')[0]}`
                      );
                      handicapObj.rate = 0;
                    } else if (tempHandicap.indexOf('輸') !== -1) {
                      handicapObj.handicap = parseFloat(
                        `-${tempHandicap.split('輸')[0]}`
                      );
                      handicapObj.rate = -100;
                    }
                    handicapObj.home_tw = null;
                    handicapObj.away_tw = tempHandicap;
                  }
                }
              }
            }
          } else {
            // 相同賠率
            if (handicapObj.handicap >= 0) {
              // 主讓客
              handicapObj.handicap = `${Math.floor(handicapObj.handicap)}`;
              handicapObj.home_tw = `${Math.floor(
                Math.abs(handicapObj.handicap)
              )}-50`;
              handicapObj.away_tw = null;
              handicapObj.rate = -50;
            } else {
              // 客讓主
              handicapObj.handicap = `${Math.ceil(handicapObj.handicap)}`;
              handicapObj.home_tw = null;
              handicapObj.away_tw = `${Math.floor(
                Math.abs(handicapObj.handicap)
              )}-50`;
              handicapObj.rate = -50;
            }
          }
        } else {
          handicapObj.handicap = null;
          handicapObj.home_tw = null;
          handicapObj.away_tw = null;
          handicapObj.rate = null;
        }
      }
    }

    if (sport === 1) {
      // 足球
      handicapObj.handicap = handicapObj.handicap.toString();
      if (handicapObj.handicap.indexOf(',') !== -1) {
        // 有兩個以上盤口
        const firstHandicap =
          -parseFloat(handicapObj.handicap.split(',')[0]);
        const secondHandicap =
          -parseFloat(handicapObj.handicap.split(',')[1]);

        if (firstHandicap % 1 !== 0) {
          // 第一盤口為小數
          if (firstHandicap >= 0 && secondHandicap >= 0) {
            // 顯示在主隊區，代表主讓客
            handicapObj.home_tw = Math.abs(firstHandicap) + '/' + Math.abs(secondHandicap);
            handicapObj.away_tw = null;
            handicapObj.handicap =
              (parseFloat((firstHandicap)) +
                parseFloat((secondHandicap))) /
              2;
            handicapObj.rate = 50;
          } else {
            // 顯示在客隊區
            handicapObj.home_tw = null;
            handicapObj.away_tw = Math.abs(firstHandicap) + '/' + Math.abs(secondHandicap);
            handicapObj.handicap =
              (parseFloat((firstHandicap)) +
                parseFloat((secondHandicap))) /
              2;
            handicapObj.rate = 50;
          }
        } else {
          // 第一盤口為整數
          if (firstHandicap >= 0) {
            // 顯示在主隊區
            handicapObj.home_tw = Math.abs(firstHandicap) + '/' + Math.abs(secondHandicap);
            handicapObj.away_tw = null;
            handicapObj.handicap =
              (parseFloat((firstHandicap)) +
                parseFloat((secondHandicap))) /
              2;
            handicapObj.rate = -50;
          } else {
            // 顯示在客隊區
            handicapObj.home_tw = null;
            handicapObj.away_tw = Math.abs(firstHandicap) + '/' + Math.abs(secondHandicap);
            handicapObj.handicap =
              (parseFloat((firstHandicap)) +
                parseFloat((secondHandicap))) /
              2;
            handicapObj.rate = -50;
          }
        }
      } else {
        // 只有一個盤口值
        handicapObj.handicap = parseFloat(handicapObj.handicap);
        handicapObj.handicap = -handicapObj.handicap;
        if (handicapObj.handicap === 0) {
          // 讓 0 分
          handicapObj.home_tw = 'PK';
          handicapObj.away_tw = null;
          handicapObj.rate = 0;
        } else if (handicapObj.handicap % 1 === 0) {
          // 整數
          if (handicapObj.handicap > 0) {
            // 主讓客
            handicapObj.home_tw = Math.abs(handicapObj.handicap);
            handicapObj.away_tw = null;
            handicapObj.rate = 0;
          } else {
            // 客讓主
            handicapObj.home_tw = null;
            handicapObj.away_tw = Math.abs(handicapObj.handicap);
            handicapObj.rate = 0;
          }
        } else if (handicapObj.handicap % 1 !== 0) {
          // 小數
          if (handicapObj.handicap > 0) {
            // 主讓客
            const str = handicapObj.handicap.toString();
            const str1 = str.split('.')[0];
            const str2 = str.split('.')[1];
            if (str2 === '25') {
              handicapObj.home_tw = `${Math.abs(parseFloat(str1))}/${Math.abs(parseFloat(str1))}.5`;
              handicapObj.away_tw = null;
              handicapObj.rate = -50;
            } else if (str2 === '75') {
              handicapObj.home_tw = `${Math.abs(parseFloat(str1))}.5/${Math.abs(parseFloat(str1)) + 1}`;
              handicapObj.away_tw = null;
              handicapObj.rate = 50;
            } else {
              handicapObj.home_tw = Math.abs(handicapObj.handicap);
              handicapObj.away_tw = null;
              handicapObj.rate = -100;
            }
          } else {
            // 客讓主
            const str = Math.abs(handicapObj.handicap).toString();
            const str1 = str.split('.')[0];
            const str2 = str.split('.')[1];
            if (str2 === '25') {
              handicapObj.home_tw = null;
              handicapObj.away_tw = `${Math.abs(parseFloat(str1))}/${Math.abs(parseFloat(str1))}.5`;
              handicapObj.rate = -50;
            } else if (str2 === '75') {
              handicapObj.home_tw = null;
              handicapObj.away_tw = `${Math.abs(parseFloat(str1))}.5/${Math.abs(parseFloat((str1))) + 1}`;
              handicapObj.rate = 50;
            } else {
              handicapObj.home_tw = null;
              handicapObj.away_tw = Math.abs(handicapObj.handicap);
              handicapObj.rate = -100;
            }
          }
        }
      }
    }
  }
  return handicapObj;
}

async function axiosForURL(URL) {
  return new Promise(async function(resolve, reject) {
    try {
      const { data } = await axios(URL);
      return resolve(data);
    } catch (err) {
      return reject(`${err.stack} by DY`);
    }
  });
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

    // 中國超級聯賽
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

    // 英超
    case '曼聯': {
      return '10899';
    }
    case '白禮頓': {
      // 布萊頓
      return '17161';
    }
    case '狼隊': {
      return '17383';
    }
    case '曼城': {
      // 曼城
      return '708';
    }
    case '阿斯頓維拉': {
      // 阿斯頓維拉
      return '43850';
    }
    case '謝菲爾德聯': {
      return '3013';
    }
    case '富勒姆': {
      // 富勒姆
      return '17170';
    }
    case '阿仙奴': {
      // 兵工廠
      return '17230';
    }
    case '水晶宮': {
      // 水晶宮
      return '17189';
    }
    case '修咸頓': {
      return '17231';
    }
    case '利物浦': {
      // 利物浦
      return '23451';
    }
    case '列斯聯': {
      // 里茲聯
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
      // 萊斯特城
      return '23452';
    }
    case '托特納姆熱刺': {
      return '17212';
    }
    case '愛華頓': {
      // 艾佛頓
      return '44249';
    }
    case '般尼': {
      // 伯恩利
      return '17159';
    }
    case '車路士': {
      // 切爾西
      return '44000';
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
    case '里昂': {
      return '19668';
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

    // 西班牙甲組聯賽
    case '西維爾': {
      // 塞維利亞
      return '1375';
    }
    case '基達菲': {
      // 赫塔費
      return '2971';
    }
    case '巴塞隆拿': {
      // 巴塞隆納
      return '1211';
    }
    case '艾爾切': {
      return '6364';
    }
    case '皇家馬德里': {
      // 皇家馬德里
      return '17163';
    }
    case '馬德里體育會': {
      // 馬德里競技
      return '10269';
    }
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
      return '43940';
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
      // 瓦倫西亞
      return '43939';
    }
    case '利雲特': {
      return '1056';
    }

    // 意大利甲組聯賽 剩 19/20 組
    case '博洛尼亞': {
      // 波隆那
      return '1231';
    }
    case '拿玻里': {
      // 拿玻里
      return '29126';
    }
    case '熱拿亞': {
      // 熱拿亞
      return '1275';
    }
    case '克努托内': {
      // 克羅托內
      return '1274';
    }
    case 'AC米蘭': {
      // AC米蘭
      return '43866';
    }
    case '烏甸尼斯': {
      // 烏甸尼斯
      return '1238';
    }
    case '費倫天拿': {
      // 費倫天拿
      return '1280';
    }
    case '拖連奴': {
      // 拖連奴
      return '1230';
    }
    case '維羅納': {
      // 維羅納
      return '7311';
    }
    case '羅馬': {
      // 羅馬
      return '1273';
    }
    case '祖雲達斯': {
      // 尤文圖斯
      return '22228';
    }
    case '斯佩齊亞': {
      // 斯佩齊亞
      return '7315';
    }
    case '薩斯索羅': {
      // 薩斯索羅
      return '1278';
    }
    case '卡利亞里': {
      // 卡利亞里
      return '1272';
    }
    case '拉素': {
      // 拉齊奧
      return '43865';
    }
    case '森多利亞': {
      // 森多利亞
      return '1276';
    }
    case '班尼雲度': {
      // 賓尼雲圖
      return '7317';
    }
    case '阿特蘭大': {
      // 亞特蘭大
      return '1277';
    }
    case '國際米蘭': {
      // 國際米蘭
      return '890';
    }
    // ---
    // 帕爾馬
    // ---

    // 德國甲組聯賽 剩 17/18 組
    case '慕遜加柏': {
      return '4806';
    }
    case '柏林聯': {
      // 柏林聯盟
      return '258';
    }
    case '美因茨05': {
      return '4283';
    }
    case '斯圖加特': {
      return '9821';
    }
    case '勒沃庫森': {
      return '15897';
    }
    case 'RB萊比錫': {
      return '823';
    }
    case '比勒費爾德': {
      // 阿米尼亞比勒費爾德
      return '257';
    }
    case '科隆': {
      return '16006';
    }
    case '奧斯堡': {
      // 奧格斯堡
      return '43933';
    }
    case '多特蒙德': {
      return '23475';
    }
    case '費雷堡': {
      return '476';
    }
    case '沃爾夫斯堡': {
      return '16005';
    }
    case '霍芬海姆': {
      return '822';
    }
    case '拜仁慕尼黑': {
      return '9943';
    }
    case '史浩克04': {
      return '9942';
    }
    case '柏林赫塔': {
      // 柏林赫塔
      return '475';
    }
    case '法蘭克福': {
      return '16016';
    }

    // ---
    // 雲達不萊梅
    // ---

    // 荷蘭甲組聯賽
    case '阿爾克馬爾': {
      // 阿爾克馬爾
      return '698';
    }
    case '海倫維恩': {
      // 海倫芬
      return '29096';
    }
    case '威廉二世': {
      // 威廉二世
      return '23727';
    }
    case '茲沃勒': {
      // 茲沃勒
      return '23654';
    }
    case '費耶諾德': {
      // 費耶諾德
      return '43767';
    }
    case '特溫特': {
      // 純特
      return '29097';
    }
    case '錫塔德命運': {
      // 福圖納斯塔德
      return '44253';
    }
    case '埃門': {
      // 埃門
      return '9910';
    }
    case '芬洛': {
      // 芬洛
      return '9913';
    }
    case '烏德勒支': {
      // 烏德勒支
      return '4241';
    }
    case '鹿特丹斯巴達': {
      // 鹿特丹斯巴達
      return '43860';
    }
    case '阿賈克斯': {
      // 阿賈克斯
      return '344';
    }
    case '赫拉克勒斯': {
      // 赫拉克勒斯
      return '342';
    }
    case '海牙': {
      // 海牙
      return '341';
    }
    case '格羅寧根': {
      // 格羅寧根
      return '220';
    }
    case 'PSV埃因霍溫': {
      // PSV恩荷芬
      return '219';
    }
    case '瓦爾維克': {
      // 瓦爾維克
      return '9917';
    }
    case '維迪斯': {
      // 維特斯
      return '43996';
    }

    // 葡萄牙超級聯賽 剩 14/18 組
    case '博阿維斯塔': {
      // 博阿維斯塔
      return '700';
    }
    case '波爾圖': {
      // 波爾圖
      return '1047';
    }
    case '波蒂蒙尼斯': {
      // 樸迪莫倫斯
      return '728';
    }
    case '費雷拉': {
      // 費雷拉
      return '43770';
    }
    case '莫雷倫斯': {
      // 莫雷倫斯
      return '704';
    }
    case '法倫斯': {
      // 法倫斯
      return '973';
    }
    case '費馬利卡奧': {
      // 法馬利卡奧
      return '923';
    }
    case '本菲卡': {
      // 班菲卡
      return '9987';
    }
    case '甘馬雷斯': {
      // 吉馬良斯
      return '31105';
    }
    case '比蘭尼塞斯': {
      // 貝倫人
      return '19658';
    }
    case '布拉加': {
      // 布拉加
      return '44094';
    }
    case '聖塔克萊拉': {
      // 辛達卡拉
      return '1166';
    }
    case '托德拉': {
      // 唐迪拉
      return '44255';
    }
    case '里奧阿維': {
      // 里奧艾維
      return '1336';
    }

    // ---
    // 士砵亭
    // 艾維斯
    // 馬里迪莫
    // 塞圖巴爾
    // ---

    // 澳足 尚未開打

    // 日本J1聯賽 日甲
    case '大分三神': {
      return '43650';
    }
    case '廣島三箭': {
      return '3366';
    }
    case '東京': {
      return '3399';
    }
    case '大阪櫻花': {
      return '5653';
    }
    case '鹿島鹿角': {
      return '5620';
    }
    case '湘南比馬': {
      return '5657';
    }
    case '神護勝利船': {
      return '3368';
    }
    case '名古屋鯨魚': {
      return '5562';
    }
    case '北海道札幌岡薩多': {
      return '5395';
    }
    case '大阪飛腳': {
      return '3367';
    }
    case '鳥栖沙岩': {
      return '5654';
    }
    case '橫濱水手': {
      return '3365';
    }
    case '柏雷素爾': {
      return '5560';
    }
    case '川崎前鋒': {
      return '5640';
    }
    case '橫濱': {
      return '5619';
    }
    case '清水心跳': {
      return '43733';
    }
    case '浦和紅鑽': {
      return '3369';
    }
    case '仙台維加泰': {
      return '5644';
    }

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
