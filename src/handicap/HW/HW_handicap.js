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
// const oddsURL = 'https://api.betsapi.com/v2/event/odds';
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
        const apiHomeId = teamName2Id(data.result.data_list[k].main_team);
        const apiAwayId = teamName2Id(data.result.data_list[k].visit_team);
        if (
          (
            (data.result.data_list[k].roll === '滾球場' && data.result.data_list[k].transType === '全場') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'MLB 美國職棒') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'MLB 美國職棒-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'MLB 美國職棒-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NPB 日本職棒') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NPB 日本職棒-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NPB 日本職棒-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'CPBL 中華職棒') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'CPBL 中華職棒-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'CPBL 中華職棒-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'KBO 韓國職棒') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'KBO 韓國職棒-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'KBO 韓國職棒-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NBA 美國職業籃球') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NBA 美國職業籃球-季後賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === 'NBA 美國職業籃球-總冠軍賽') ||
						(data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '日本籃球B聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '日本籃球B聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '日本籃球B聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '英格蘭超級聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '英格蘭超級聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '英格蘭超級聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '法國甲組聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '法國甲組聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '法國甲組聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '西班牙甲組聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '西班牙甲組聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '西班牙甲組聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '意大利甲組聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '意大利甲組聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '意大利甲組聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '荷蘭甲組聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '荷蘭甲組聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '荷蘭甲組聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '葡萄牙超級聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '葡萄牙超級聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '葡萄牙超級聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '中國超級聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '中國超級聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '中國超級聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '德國甲組聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '德國甲組聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '德國甲組聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '日本J1聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '日本J1聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '日本J1聯賽-總冠軍賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '韓國K甲組聯賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '韓國K甲組聯賽-季後賽') ||
            (data.result.data_list[k].transType === '全場' && data.result.data_list[k].league_name === '韓國K甲組聯賽-總冠軍賽')

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
              secondHandicap = secondHandicap.replace('半', '.5');
              data.result.data_list[k].proffer_one_A = (parseFloat(firstHandicap) + parseFloat(secondHandicap)) / 2;
              if (String(data.result.data_list[k].proffer_one_A).indexOf('.25') >= 0) {
                data.result.data_list[k].proffer_two_A = '-50';
              } else if (String(data.result.data_list[k].proffer_one_A).indexOf('.5') >= 0) {
                data.result.data_list[k].proffer_two_A = '-100';
              } else if (String(data.result.data_list[k].proffer_one_A).indexOf('.75') >= 0) {
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
              secondHandicap = secondHandicap.replace('半', '.5');
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
            apiSpreadStatus = String(data.result.data_list[k].proffer_mode);
            // 需注意讓零分時 盤口會呈現 PK 或讓 0 分
            apiSpreadHandicap = data.result.data_list[k].proffer_one_A === 'PK' || parseFloat(data.result.data_list[k].proffer_one_A) === 0 ? 0 : apiSpreadStatus === '1' ? parseFloat(data.result.data_list[k].proffer_one_A) : -parseFloat(data.result.data_list[k].proffer_one_A);
            apiSpreadRate = parseFloat(data.result.data_list[k].proffer_two_A);
            apiTotalsHandicap = parseFloat(data.result.data_list[k].proffer_one_bs);
            apiTotalsRate = parseFloat(data.result.data_list[k].proffer_two_bs);
            apiSpreadTw = String(spreadTw);
            apiTotalsTw = String(totalsTw);
          } else {
            apiSpreadStatus = String(data.result.data_list[k].proffer_mode);
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
        // getHandicapFromBets(ele[j], ele[j].league_id, sportId, hwSpreadFlag, hwTotalsFlag);
      }
    }
  }

  console.log('Get Handicap success');
}

// async function getHandicapFromBets(ele, league, sport, hwSpreadFlag, hwTotalsFlag) {
//  const URL = `${oddsURL}?token=${envValues.betsToken}&event_id=${ele.bets_id}&odds_market=2,3`;
//  const data = await axiosForURL(URL);
//  let spread_odds = [];
//  let totals_odds = [];
//  if (data.results) {
//    if (data.results.odds) {
//      if (hwSpreadFlag === 0) {
//        if (data.results.odds[`${sport}_2`]) {
//          spread_odds = data.results.odds[`${sport}_2`];
//        }
//        let newest_spread;
//        if (spread_odds.length > 0) {
//          const spcount = 0;
//          if (
//            spread_odds[spcount].home_od !== null &&
//					spread_odds[spcount].handicap !== null &&
//					spread_odds[spcount].away_od !== null &&
//					spread_odds[spcount].home_od !== '-' &&
//					spread_odds[spcount].away_od !== '-' &&
//					spread_odds[spcount].add_time * 1000 <= ele.scheduled * 1000
//          ) {
//            newest_spread = spread_odds[spcount];
//            newest_spread = spreadCalculator(newest_spread, sport, league);
//            write2MysqlOfMatchAboutNewestSpread(ele, newest_spread);
//            write2MysqlOfMatchSpread(newest_spread, ele, league);
//          }
//        }
//      }
//      if (hwTotalsFlag === 0) {
//        if (data.results.odds[`${sport}_3`]) {
//          totals_odds = data.results.odds[`${sport}_3`];
//        }
//        let newest_totals;
//        if (totals_odds.length > 0) {
//          const tocount = 0;
//          if (
//            totals_odds[tocount].over_od !== null &&
//                totals_odds[tocount].handicap !== null &&
//                totals_odds[tocount].under_od !== null &&
//                totals_odds[tocount].over_od !== '-' &&
//                totals_odds[tocount].under_od !== '-' &&
//                totals_odds[tocount].add_time * 1000 <= ele.scheduled * 1000
//          ) {
//            newest_totals = totals_odds[tocount];
//            newest_totals = totalsCalculator(newest_totals, sport);
//            write2MysqlOfMatchAboutNewestTotals(ele, newest_totals);
//            write2MysqlOfMatchTotals(newest_totals, ele, league);
//          }
//        }
//      }
//    }
//  }
// }

// function totalsCalculator(handicapObj, sport) {
//  handicapObj.handicap = parseFloat(handicapObj.handicap);
//  handicapObj.over_odd = parseFloat(handicapObj.over_od);
//  handicapObj.under_odd = parseFloat(handicapObj.under_od);
//  if (handicapObj.handicap === 0 || handicapObj.handicap !== null) {
//    if (sport === 17 || sport === 18) {
//      // 籃球或冰球
//      if (handicapObj.handicap % 1 === 0) {
//        // 整數
//        handicapObj.over_tw = `${handicapObj.handicap}平`;
//        handicapObj.rate = 0;
//      } else {
//        // 小數
//        handicapObj.over_tw = `${handicapObj.handicap}`;
//        handicapObj.rate = -100;
//      }
//    }
//    if (sport === 16) {
//      // 棒球

//      if (handicapObj.handicap % 1 === 0) {
//        // 整數
//        if (handicapObj.over_odd !== handicapObj.under_odd) {
//          // 賠率不同
//          if (handicapObj.over_odd > handicapObj.under_odd) {
//            // 大分賠率>小分賠率
//            handicapObj.over_tw = `${handicapObj.handicap}+50`;
//            handicapObj.rate = 50;
//          } else {
//            // 小分賠率>大分賠率
//            handicapObj.over_tw = `${handicapObj.handicap}-50`;
//            handicapObj.rate = -50;
//          }
//        } else {
//          // 賠率相同
//          handicapObj.over_tw = `${handicapObj.handicap}平`;
//          handicapObj.rate = 0;
//        }
//      } else {
//        // 小數
//        if (handicapObj.over_odd !== handicapObj.under_odd) {
//          // 賠率不同
//          if (handicapObj.over_odd > handicapObj.under_odd) {
//            // 大分賠率>小分賠率
//            handicapObj.over_tw = `${Math.floor(handicapObj.handicap)}+50`;
//            handicapObj.rate = 50;
//            handicapObj.handicap = `${Math.floor(
//              Math.abs(handicapObj.handicap)
//            )}`;
//          } else {
//            // 小分賠率>大分賠率
//            handicapObj.over_tw = `${Math.floor(handicapObj.handicap)}-50`;
//            handicapObj.rate = -50;
//            handicapObj.handicap = `${Math.floor(
//              Math.abs(handicapObj.handicap)
//            )}`;
//          }
//        } else {
//          // 賠率相同
//          handicapObj.over_tw = `${Math.floor(handicapObj.handicap)}-100`;
//          handicapObj.rate = -100;
//        }
//      }
//    }

//    if (sport === 1) {
//      // 足球
//      if (handicapObj.handicap) {
//        handicapObj.handicap = handicapObj.handicap.toString();
//        if (handicapObj.handicap.indexOf(',') !== -1) {
//          const firstHandicap = Math.abs(
//            parseFloat(handicapObj.handicap.split(',')[0])
//          );
//          const secondHandicap = Math.abs(
//            parseFloat(handicapObj.handicap.split(',')[1])
//          );
//          if (firstHandicap % 1 !== 0) {
//            // 第一盤口為小數
//            handicapObj.over_tw = firstHandicap + '/' + secondHandicap;
//            handicapObj.handicap =
//              (parseFloat(Math.abs(firstHandicap)) +
//                parseFloat(Math.abs(secondHandicap))) /
//              2;
//            handicapObj.rate = 50;
//          } else {
//            // 第一盤口為整數
//            // 顯示在主隊區
//            handicapObj.over_tw = firstHandicap + '/' + secondHandicap;
//            handicapObj.handicap =
//              (parseFloat(Math.abs(firstHandicap)) +
//                parseFloat(Math.abs(secondHandicap))) /
//              2;
//            handicapObj.rate = -50;
//          }
//        } else {
//          // 盤口只有一個數
//          const str = handicapObj.handicap.toString();
//          const str1 = str.split('.')[0];
//          const str2 = str.split('.')[1];
//          if (str2 === '25') {
//            handicapObj.over_tw = `${str1}/${str1}.5`;
//            handicapObj.rate = -50;
//          } else if (str2 === '75') {
//            handicapObj.over_tw = `${str1}.5/${parseFloat(str1) + 1}`;
//            handicapObj.rate = 50;
//          } else {
//            handicapObj.over_tw = Math.abs(handicapObj.handicap);
//            handicapObj.rate = 0;
//          }
//        }
//      }
//    }
//  }
//  return handicapObj;
// }

// async function write2MysqlOfMatchSpread(odd, ele, leagueUniteID) {
//  return new Promise(async function(resolve, reject) {
//    if (
//      leagueUniteID === '11235' || // 中華職棒
//      leagueUniteID === '347' || // 日本棒球
//      leagueUniteID === '349' || // 韓國棒球
//			leagueUniteID === '225' ||// 美國棒球
//			leagueUniteID === '3939' ||// 美國棒球
//			leagueUniteID === '2274' ||// 美國籃球
//			leagueUniteID === '244' ||// WNBA
//			leagueUniteID === '1926'// 美國冰球
//    ) {
//      try {
//        if (leagueUniteID === '225') {
//          leagueUniteID = '3939';
//        }
//        Spread.upsert({
//          spread_id: odd.id,
//          match_id: ele.bets_id,
//          league_id: leagueUniteID,
//          handicap: Number.parseFloat(odd.handicap),
//          rate: Number.parseFloat(odd.rate),
//          home_odd: Number.parseFloat(odd.away_od),
//          away_odd: Number.parseFloat(odd.home_od),
//          home_tw: odd.home_tw,
//          away_tw: odd.away_tw,
//          add_time: Number.parseInt(odd.add_time) * 1000
//        });
//        return resolve('ok');
//      } catch (err) {
//        return reject(`${err.stack} by DY`);
//      }
//    } else {
//      try {
//        Spread.upsert({
//          spread_id: odd.id,
//          match_id: ele.bets_id,
//          league_id: leagueUniteID,
//          handicap: Number.parseFloat(odd.handicap),
//          rate: Number.parseFloat(odd.rate),
//          home_odd: Number.parseFloat(odd.home_od),
//          away_odd: Number.parseFloat(odd.away_od),
//          home_tw: odd.home_tw,
//          away_tw: odd.away_tw,
//          add_time: Number.parseInt(odd.add_time) * 1000
//        });
//        return resolve('ok');
//      } catch (err) {
//        return reject(`${err.stack} by DY`);
//      }
//    }
//  });
// }
// async function write2MysqlOfMatchTotals(odd, ele, leagueUniteID) {
//  return new Promise(async function(resolve, reject) {
//    try {
//      Totals.upsert({
//        totals_id: odd.id,
//        match_id: ele.bets_id,
//        league_id: leagueUniteID,
//        handicap: Number.parseFloat(odd.handicap),
//        rate: Number.parseFloat(odd.rate),
//        over_odd: Number.parseFloat(odd.over_od),
//        under_odd: Number.parseFloat(odd.under_od),
//        over_tw: odd.over_tw,
//        add_time: Number.parseInt(odd.add_time) * 1000
//      });
//      return resolve('ok');
//    } catch (err) {
//      return reject(`${err.stack} by DY`);
//    }
//  });
// }

// async function write2MysqlOfMatchAboutNewestSpread(ele, newest_spread) {
//  return new Promise(async function(resolve, reject) {
//    try {
//      Match.upsert({
//        bets_id: ele.bets_id,
//        spread_id: newest_spread.id
//      });
//      return resolve('ok');
//    } catch (err) {
//      return reject(`${err.stack} by DY`);
//    }
//  });
// }

// async function write2MysqlOfMatchAboutNewestTotals(ele, newest_totals) {
//  return new Promise(async function(resolve, reject) {
//    try {
//      Match.upsert({
//        bets_id: ele.bets_id,
//        totals_id: newest_totals.id
//      });
//      return resolve('ok');
//    } catch (err) {
//      return reject(`${err.stack} by DY`);
//    }
//  });
// }

// function modifyHandicap(handicap, upOrDown, unit) {
//  const specificTable = ['1+50', 'PK', 'PK', 'PK']; //   ver.2 邏輯
//  const pkTable = ['PK', 'PK', 'PK', 'PK'];
//  let handicapNow;
//  const unitArray = Math.ceil(unit / 4) + 1; // 總共需要幾個unit組合
//  const calculateArray = [];
//  if (upOrDown === 1) {
//    // 往上數
//    for (let i = 0; i < unitArray; i++) {
//      handicapNow = Math.floor(handicap) - i;
//      // add array
//      if (handicapNow === 0) {
//        // 加特殊情況
//        specificTable.forEach((item) => calculateArray.push(item));
//      } else if (handicapNow < 0) {
//        pkTable.forEach((item) => calculateArray.push(item));
//      } else {
//        // 加一般陣列
//        normalTable(handicapNow, upOrDown).forEach((item) =>
//          calculateArray.push(item)
//        );
//      }
//    }
//  } else {
//    // 往下數
//    for (let i = 0; i < unitArray; i++) {
//      // add array
//      handicapNow = Math.floor(handicap) + i + 1;
//      // 加一般陣列
//      normalTable(handicapNow, upOrDown).forEach((item) =>
//        calculateArray.push(item)
//      );
//    }
//    if (unit !== 0) {
//      unit = unit - 1;
//    }
//  }

//  let tempHandicap = calculateArray[unit];

//  if (tempHandicap === undefined) {
//    tempHandicap = handicap;
//  }
//  return tempHandicap;
// }

// function normalTable(handicap, upOrDown) {
//  if (upOrDown === 1) {
//    return [
//      `${Math.floor(handicap)}-100`,
//      `${Math.floor(handicap)}-50`,
//      `${Math.floor(handicap)}平`,
//      `${Math.floor(handicap)}+50`
//    ];
//  } else {
//    return [
//      `${Math.floor(handicap)}+50`,
//      `${Math.floor(handicap)}平`,
//      `${Math.floor(handicap)}-50`,
//      `${Math.floor(handicap)}-100`
//    ];
//  }
// }

// function spreadCalculator(handicapObj, sport, league) {
//  if (handicapObj.handicap === 0 || handicapObj.handicap !== null) {
//    if (league === '2319') {
//      // 籃球等主客正常的
//      handicapObj.handicap = -parseFloat(handicapObj.handicap);
//      handicapObj.home_odd = parseFloat(handicapObj.home_od);
//      handicapObj.away_odd = parseFloat(handicapObj.away_od);
//    } else {
//      // 棒球等主客交換的
//      handicapObj.handicap = parseFloat(handicapObj.handicap);
//      handicapObj.home_odd = parseFloat(handicapObj.away_od);
//      handicapObj.away_odd = parseFloat(handicapObj.home_od);
//    }

//    if (sport === 17 || sport === 18) {
//      // 籃球或冰球
//      if (handicapObj.handicap % 1 === 0) {
//        // 整數盤口
//        if (handicapObj.handicap >= 0) {
//          // 主讓客
//          handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}平`;
//          handicapObj.away_tw = null;

//          handicapObj.rate = 0;
//        } else {
//          // 客讓主
//          handicapObj.home_tw = null;
//          handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}平`;

//          handicapObj.rate = 0;
//        }
//      } else {
//        // 小數盤口
//        if (handicapObj.handicap >= 0) {
//          // 主讓客
//          handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}`;
//          handicapObj.away_tw = null;

//          handicapObj.rate = 0;
//        } else {
//          // 客讓主
//          handicapObj.home_tw = null;
//          handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}`;

//          handicapObj.rate = 0;
//        }
//      }
//    }

//    if (sport === 16) {
//      // 棒球
//      if (handicapObj.handicap % 1 === 0) {
//        // 整數盤口
//        if (handicapObj.home_odd !== handicapObj.away_odd) {
//          // 不同賠率
//          if (handicapObj.handicap >= 0) {
//            // 主讓客
//            if (handicapObj.home_odd > handicapObj.away_odd) {
//              // 主賠率>客賠率 顯示 +
//              handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}+50`;
//              handicapObj.away_tw = null;
//              handicapObj.rate = 50;
//            } else {
//              // 客賠率>主賠率 顯示 -
//              handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}-50`;
//              handicapObj.away_tw = null;
//              handicapObj.rate = -50;
//            }
//          } else {
//            // 客讓主
//            if (handicapObj.home_odd > handicapObj.away_odd) {
//              // 主賠率>客賠率 顯示 -
//              handicapObj.home_tw = null;
//              handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}-50`;
//              handicapObj.rate = -50;
//            } else {
//              // 客賠率>主賠率 顯示 +
//              handicapObj.home_tw = null;
//              handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}+50`;
//              handicapObj.rate = 50;
//            }
//          }
//        } else {
//          // 相同賠率
//          if (handicapObj.handicap >= 0) {
//            // 主讓客
//            handicapObj.home_tw = `${Math.abs(handicapObj.handicap)}平`;
//            handicapObj.away_tw = null;
//            handicapObj.rate = 0;
//          } else {
//            // 客讓主
//            handicapObj.home_tw = null;
//            handicapObj.away_tw = `${Math.abs(handicapObj.handicap)}平`;
//            handicapObj.rate = 0;
//          }
//        }
//      } else {
//        // 小數盤口
//        if (handicapObj.handicap > 1 || handicapObj.handicap < -1) {
//          if (handicapObj.home_odd !== handicapObj.away_odd) {
//            // 不同賠率
//            let tempHandicap;
//            if (handicapObj.home_odd >= 1.85 && handicapObj.away_odd >= 1.85) {
//              // 主/客賠率都大於等於 1.85 時不調整
//              if (handicapObj.handicap >= 0) {
//                // 主讓客
//                if (handicapObj.home_odd > handicapObj.away_odd) {
//                  // 主賠率 > 客賠率 顯示 +
//                  handicapObj.handicap = `${Math.floor(handicapObj.handicap)}`;
//                  handicapObj.home_tw = `${Math.floor(
//                    Math.abs(handicapObj.handicap)
//                  )}+50`;
//                  handicapObj.away_tw = null;
//                  handicapObj.rate = 50;
//                } else {
//                  // 主賠率<客賠率 顯示 -
//                  handicapObj.handicap = `${Math.floor(handicapObj.handicap)}`;
//                  handicapObj.home_tw = `${Math.floor(
//                    Math.abs(handicapObj.handicap)
//                  )}-50`;
//                  handicapObj.away_tw = null;
//                  handicapObj.rate = -50;
//                }
//              } else {
//                // 客讓主
//                if (handicapObj.home_odd > handicapObj.away_odd) {
//                  // 主賠率>客賠率 顯示 -
//                  handicapObj.handicap = `${Math.ceil(handicapObj.handicap)}`;
//                  handicapObj.home_tw = null;
//                  handicapObj.away_tw = `${Math.floor(
//                    Math.abs(handicapObj.handicap)
//                  )}-50`;
//                  handicapObj.rate = -50;
//                } else {
//                  // 主賠率<客賠率 顯示 +
//                  handicapObj.handicap = `${Math.ceil(handicapObj.handicap)}`;
//                  handicapObj.home_tw = null;
//                  handicapObj.away_tw = `${Math.floor(
//                    Math.abs(handicapObj.handicap)
//                  )}+50`;
//                  handicapObj.rate = 50;
//                }
//              }
//            } else {
//              // 主/客賠率其中一個小於 1.85 時做調整 todo
//              if (handicapObj.home_odd > handicapObj.away_odd) {
//                // 主賠率>客賠率
//                if (handicapObj.handicap > 0) {
//                  // 主讓客 = 斜邊 = 往上數
//                  tempHandicap = modifyHandicap(
//                    Math.abs(handicapObj.handicap),
//                    1,
//                    Math.round((1.85 - handicapObj.away_odd) / 0.06)
//                  );
//                } else {
//                  // 客讓主 = 同邊 = 往下數
//                  tempHandicap = modifyHandicap(
//                    Math.abs(handicapObj.handicap),
//                    -1,
//                    Math.round((1.85 - handicapObj.away_odd) / 0.06)
//                  );
//                }
//              } else {
//                // 客賠率>主賠率
//                if (handicapObj.handicap >= 0) {
//                  // 主讓客 = 同邊 = 往下數
//                  tempHandicap = modifyHandicap(
//                    Math.abs(handicapObj.handicap),
//                    -1,
//                    Math.round((1.85 - handicapObj.home_odd) / 0.06)
//                  );
//                } else {
//                  // 客讓主 = 斜邊 = 往上數
//                  tempHandicap = modifyHandicap(
//                    Math.abs(handicapObj.handicap),
//                    1,
//                    Math.round((1.85 - handicapObj.home_odd) / 0.06)
//                  );
//                }
//              }

//              // here
//              if (tempHandicap !== undefined) {
//                if (tempHandicap === 'PK') {
//                  handicapObj.handicap = 0;
//                  handicapObj.rate = 0;
//                  handicapObj.home_tw = 'PK';
//                  handicapObj.away_tw = null;
//                }
//                if (handicapObj.handicap >= 0) {
//                  // 原本的盤口>=0 主讓客
//                  if (tempHandicap[0] === '-') {
//                    // 盤口變號 變成客讓主
//                    tempHandicap = tempHandicap.replace('-', '');
//                    if (tempHandicap.indexOf('-') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `-${tempHandicap.split('-')[0]}`
//                      );
//                      handicapObj.rate = parseFloat(
//                        `-${tempHandicap.split('-')[1]}`
//                      );
//                    } else if (tempHandicap.indexOf('+') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `-${tempHandicap.split('+')[0]}`
//                      );
//                      handicapObj.rate = parseFloat(tempHandicap.split('+')[1]);
//                    } else if (tempHandicap.indexOf('平') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `-${tempHandicap.split('平')[0]}`
//                      );
//                      handicapObj.rate = 0;
//                    } else if (tempHandicap.indexOf('輸') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `-${tempHandicap.split('輸')[0]}`
//                      );
//                      handicapObj.rate = -100;
//                    }
//                    handicapObj.home_tw = null;
//                    handicapObj.away_tw = tempHandicap;
//                  } else {
//                    // 不用變號
//                    if (tempHandicap.indexOf('-') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        tempHandicap.split('-')[0]
//                      );
//                      handicapObj.rate = parseFloat(
//                        `-${tempHandicap.split('-')[1]}`
//                      );
//                    } else if (tempHandicap.indexOf('+') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        tempHandicap.split('+')[0]
//                      );
//                      handicapObj.rate = parseFloat(tempHandicap.split('+')[1]);
//                    } else if (tempHandicap.indexOf('平') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        tempHandicap.split('平')[0]
//                      );
//                      handicapObj.rate = 0;
//                    } else if (tempHandicap.indexOf('輸') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        tempHandicap.split('輸')[0]
//                      );
//                      handicapObj.rate = -100;
//                    }
//                    handicapObj.home_tw = tempHandicap;
//                    handicapObj.away_tw = null;
//                  }
//                } else {
//                  // 原本的盤口<0 客讓主
//                  if (tempHandicap[0] === '-') {
//                    // 變號 變成主讓客
//                    tempHandicap = tempHandicap.replace('-', '');
//                    if (tempHandicap.indexOf('-') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `${tempHandicap.split('-')[0]}`
//                      );
//                      handicapObj.rate = parseFloat(
//                        `-${tempHandicap.split('-')[1]}`
//                      );
//                    } else if (tempHandicap.indexOf('+') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `${tempHandicap.split('+')[0]}`
//                      );
//                      handicapObj.rate = parseFloat(tempHandicap.split('+')[1]);
//                    } else if (tempHandicap.indexOf('平') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `${tempHandicap.split('平')[0]}`
//                      );
//                      handicapObj.rate = 0;
//                    } else if (tempHandicap.indexOf('輸') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `${tempHandicap.split('輸')[0]}`
//                      );
//                      handicapObj.rate = -100;
//                    }
//                    handicapObj.home_tw = tempHandicap;
//                    handicapObj.away_tw = null;
//                  } else {
//                    // 不用變號
//                    if (tempHandicap.indexOf('-') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `-${tempHandicap.split('-')[0]}`
//                      );
//                      handicapObj.rate = parseFloat(
//                        `-${tempHandicap.split('-')[1]}`
//                      );
//                    } else if (tempHandicap.indexOf('+') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `-${tempHandicap.split('+')[0]}`
//                      );
//                      handicapObj.rate = parseFloat(tempHandicap.split('+')[1]);
//                    } else if (tempHandicap.indexOf('平') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `-${tempHandicap.split('平')[0]}`
//                      );
//                      handicapObj.rate = 0;
//                    } else if (tempHandicap.indexOf('輸') !== -1) {
//                      handicapObj.handicap = parseFloat(
//                        `-${tempHandicap.split('輸')[0]}`
//                      );
//                      handicapObj.rate = -100;
//                    }
//                    handicapObj.home_tw = null;
//                    handicapObj.away_tw = tempHandicap;
//                  }
//                }
//              }
//            }
//          } else {
//            // 相同賠率
//            if (handicapObj.handicap >= 0) {
//              // 主讓客
//              handicapObj.handicap = `${Math.floor(handicapObj.handicap)}`;
//              handicapObj.home_tw = `${Math.floor(
//                Math.abs(handicapObj.handicap)
//              )}-50`;
//              handicapObj.away_tw = null;
//              handicapObj.rate = -50;
//            } else {
//              // 客讓主
//              handicapObj.handicap = `${Math.ceil(handicapObj.handicap)}`;
//              handicapObj.home_tw = null;
//              handicapObj.away_tw = `${Math.floor(
//                Math.abs(handicapObj.handicap)
//              )}-50`;
//              handicapObj.rate = -50;
//            }
//          }
//        } else {
//          handicapObj.handicap = null;
//          handicapObj.home_tw = null;
//          handicapObj.away_tw = null;
//          handicapObj.rate = null;
//        }
//      }
//    }

//    if (sport === 1) {
//      // 足球
//      handicapObj.handicap = handicapObj.handicap.toString();
//      if (handicapObj.handicap.indexOf(',') !== -1) {
//        // 有兩個以上盤口
//        const firstHandicap =
//          -parseFloat(handicapObj.handicap.split(',')[0]);
//        const secondHandicap =
//          -parseFloat(handicapObj.handicap.split(',')[1]);

//        if (firstHandicap % 1 !== 0) {
//          // 第一盤口為小數
//          if (firstHandicap >= 0 && secondHandicap >= 0) {
//            // 顯示在主隊區，代表主讓客
//            handicapObj.home_tw = Math.abs(firstHandicap) + '/' + Math.abs(secondHandicap);
//            handicapObj.away_tw = null;
//            handicapObj.handicap =
//              (parseFloat((firstHandicap)) +
//                parseFloat((secondHandicap))) /
//              2;
//            handicapObj.rate = 50;
//          } else {
//            // 顯示在客隊區
//            handicapObj.home_tw = null;
//            handicapObj.away_tw = Math.abs(firstHandicap) + '/' + Math.abs(secondHandicap);
//            handicapObj.handicap =
//              (parseFloat((firstHandicap)) +
//                parseFloat((secondHandicap))) /
//              2;
//            handicapObj.rate = 50;
//          }
//        } else {
//          // 第一盤口為整數
//          if (firstHandicap >= 0) {
//            // 顯示在主隊區
//            handicapObj.home_tw = Math.abs(firstHandicap) + '/' + Math.abs(secondHandicap);
//            handicapObj.away_tw = null;
//            handicapObj.handicap =
//              (parseFloat((firstHandicap)) +
//                parseFloat((secondHandicap))) /
//              2;
//            handicapObj.rate = -50;
//          } else {
//            // 顯示在客隊區
//            handicapObj.home_tw = null;
//            handicapObj.away_tw = Math.abs(firstHandicap) + '/' + Math.abs(secondHandicap);
//            handicapObj.handicap =
//              (parseFloat((firstHandicap)) +
//                parseFloat((secondHandicap))) /
//              2;
//            handicapObj.rate = -50;
//          }
//        }
//      } else {
//        // 只有一個盤口值
//        handicapObj.handicap = parseFloat(handicapObj.handicap);
//        handicapObj.handicap = -handicapObj.handicap;
//        if (handicapObj.handicap === 0) {
//          // 讓 0 分
//          handicapObj.home_tw = 'PK';
//          handicapObj.away_tw = null;
//          handicapObj.rate = 0;
//        } else if (handicapObj.handicap % 1 === 0) {
//          // 整數
//          if (handicapObj.handicap > 0) {
//            // 主讓客
//            handicapObj.home_tw = Math.abs(handicapObj.handicap);
//            handicapObj.away_tw = null;
//            handicapObj.rate = 0;
//          } else {
//            // 客讓主
//            handicapObj.home_tw = null;
//            handicapObj.away_tw = Math.abs(handicapObj.handicap);
//            handicapObj.rate = 0;
//          }
//        } else if (handicapObj.handicap % 1 !== 0) {
//          // 小數
//          if (handicapObj.handicap > 0) {
//            // 主讓客
//            const str = handicapObj.handicap.toString();
//            const str1 = str.split('.')[0];
//            const str2 = str.split('.')[1];
//            if (str2 === '25') {
//              handicapObj.home_tw = `${Math.abs(parseFloat(str1))}/${Math.abs(parseFloat(str1))}.5`;
//              handicapObj.away_tw = null;
//              handicapObj.rate = -50;
//            } else if (str2 === '75') {
//              handicapObj.home_tw = `${Math.abs(parseFloat(str1))}.5/${Math.abs(parseFloat(str1)) + 1}`;
//              handicapObj.away_tw = null;
//              handicapObj.rate = 50;
//            } else {
//              handicapObj.home_tw = Math.abs(handicapObj.handicap);
//              handicapObj.away_tw = null;
//              handicapObj.rate = -100;
//            }
//          } else {
//            // 客讓主
//            const str = Math.abs(handicapObj.handicap).toString();
//            const str1 = str.split('.')[0];
//            const str2 = str.split('.')[1];
//            if (str2 === '25') {
//              handicapObj.home_tw = null;
//              handicapObj.away_tw = `${Math.abs(parseFloat(str1))}/${Math.abs(parseFloat(str1))}.5`;
//              handicapObj.rate = -50;
//            } else if (str2 === '75') {
//              handicapObj.home_tw = null;
//              handicapObj.away_tw = `${Math.abs(parseFloat(str1))}.5/${Math.abs(parseFloat((str1))) + 1}`;
//              handicapObj.rate = 50;
//            } else {
//              handicapObj.home_tw = null;
//              handicapObj.away_tw = Math.abs(handicapObj.handicap);
//              handicapObj.rate = -100;
//            }
//          }
//        }
//      }
//    }
//  }
//  return handicapObj;
// }

// async function axiosForURL(URL) {
//  return new Promise(async function(resolve, reject) {
//    try {
//      const { data } = await axios(URL);
//      return resolve(data);
//    } catch (err) {
//      return reject(`${err.stack} by DY`);
//    }
//  });
// }

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

function teamName2Id(name) {
  // MLB
  if (name.includes('明尼蘇達雙城')) return '1088';
  else if (name.includes('多倫多藍鳥')) return '1089';
  else if (name.includes('洛杉磯天使')) return '1090';
  else if (name.includes('底特律老虎')) return '1091';
  else if (name.includes('聖地牙哥教士')) return '1108';
  else if (name.includes('邁阿密馬林魚')) return '1109';
  else if (name.includes('費城費城人')) return '1112';
  else if (name.includes('紐約大都會')) return '1113';
  else if (name.includes('巴爾的摩金鶯')) return '1120';
  else if (name.includes('紐約洋基')) return '1121';
  else if (name.includes('科羅拉多落磯山')) return '1146';
  else if (name.includes('華盛頓國民')) return '1147';
  else if (name.includes('匹茲堡海盜')) return '1186';
  else if (name.includes('密爾瓦基釀酒人')) return '1187';
  else if (name.includes('西雅圖水手')) return '1202';
  else if (name.includes('芝加哥白襪')) return '1203';
  else if (name.includes('坦帕灣光芒')) return '1216';
  else if (name.includes('休士頓太空人')) return '1217';
  else if (name.includes('奧克蘭運動家')) return '1222';
  else if (name.includes('聖路易紅雀')) return '1223';
  else if (name.includes('克里夫蘭印地安人')) return '1310';
  else if (name.includes('德州遊騎兵')) return '1311';
  else if (name.includes('亞特蘭大勇士')) return '1352';
  else if (name.includes('舊金山巨人')) return '1353';
  else if (name.includes('辛辛那堤紅人')) return '1364';
  else if (name.includes('亞利桑那響尾蛇')) return '1365';
  else if (name.includes('芝加哥小熊')) return '1368';
  else if (name.includes('洛杉磯道奇')) return '1369';
  else if (name.includes('堪薩斯皇家')) return '1478';
  else if (name.includes('波士頓紅襪')) return '1479';
  // NPB
  else if (name.includes('福岡軟銀鷹')) return '2386';
  else if (name.includes('西武獅')) return '2387';
  else if (name.includes('橫濱DeNA灣星')) return '3323';
  else if (name.includes('中日龍')) return '3318';
  else if (name.includes('千葉羅德')) return '6650';
  else if (name.includes('歐力士猛牛')) return '8025';
  else if (name.includes('阪神虎')) return '3317';
  else if (name.includes('廣島鯉魚')) return '3324';
  else if (name.includes('東北樂天鷹')) return '5438';
  else if (name.includes('日本火腿')) return '10078';
  else if (name.includes('讀賣巨人')) return '45295';
  else if (name.includes('養樂多燕子')) return '10216';
  // KBO
  else if (name.includes('華老鷹')) return '2405';
  else if (name.includes('飛龍')) return '8043';
  else if (name.includes('起亞老虎')) return '4202';
  else if (name.includes('鬥山熊')) return '2406';
  else if (name.includes('雙子')) return '2407';
  else if (name.includes('英雄')) return '269103';
  else if (name.includes('樂天巨人')) return '2408';
  else if (name.includes('三星獅子')) return '3356';
  else if (name.includes('恐龍')) return '3353';
  else if (name.includes('巫師')) return '3354';
  // CPBL
  else if (name.includes('富邦悍將')) return '224094';
  else if (name.includes('樂天桃猿')) return '329121';
  else if (name.includes('統一獅')) return '224095';
  else if (name.includes('中信兄弟')) return '230422';
  // NBA
  else if (name.includes('洛杉磯快艇')) return '53389';
  else if (name.includes('丹佛金塊')) return '54378';
  else if (name.includes('多倫多暴龍')) return '53768';
  else if (name.includes('波士頓塞爾蒂克')) return '56280';
  else if (name.includes('密爾瓦基公鹿')) return '52913';
  else if (name.includes('奧克拉荷馬雷霆')) return '52891';
  else if (name.includes('休士頓火箭')) return '52640';
  else if (name.includes('猶他爵士')) return '55289';
  else if (name.includes('布魯克林籃網')) return '54759';
  else if (name.includes('奧蘭多魔術')) return '56088';
  else if (name.includes('華盛頓巫師')) return '53953';
  else if (name.includes('鳳凰城太陽')) return '56107';
  else if (name.includes('波特蘭拓荒者')) return '55868';
  else if (name.includes('曼斐斯灰熊')) return '58056';
  else if (name.includes('聖安東尼奧馬刺')) return '56087';
  else if (name.includes('沙加緬度國王')) return '55290';
  else if (name.includes('達拉斯獨行俠')) return '58479';
  else if (name.includes('邁阿密熱火')) return '57721';
  else if (name.includes('紐奧良鵜鶘')) return '54878';
  else if (name.includes('費城76人')) return '53954';
  else if (name.includes('印第安納溜馬')) return '54763';
  else if (name.includes('洛杉磯湖人')) return '54379';
  else if (name.includes('克里夫蘭騎士')) return '55277';
  else if (name.includes('芝加哥公牛')) return '52914';
  else if (name.includes('金州勇士')) return '53390';
  else if (name.includes('底特律活塞')) return '56737';
  else if (name.includes('夏洛特黃蜂')) return '58265';
  else if (name.includes('明尼蘇達灰狼')) return '58057';
  else if (name.includes('紐約尼克')) return '54760';
  else if (name.includes('亞特蘭大老鷹')) return '55278';
  // NHL 剩 7 組
  else if (name.includes('紐約島人')) return '52379';
  else if (name.includes('坦帕灣閃電')) return '56281';
  else if (name.includes('卡羅萊納颶風')) return '50631';
  else if (name.includes('紐約游騎兵')) return '51831';
  else if (name.includes('埃德蒙頓油工')) return '51659';
  else if (name.includes('芝加哥黑鷹')) return '51657';
  else if (name.includes('佛羅里達美洲豹')) return '54761';
  else if (name.includes('匹茲堡企鵝')) return '51656';
  else if (name.includes('蒙特利爾加拿大人')) return '51102';
  else if (name.includes('卡爾加里火焰')) return '52041';
  else if (name.includes('溫尼伯噴氣機')) return '52642';
  else if (name.includes('納什維爾掠奪者')) return '51832';
  else if (name.includes('亞利桑那土狼')) return '52936';
  else if (name.includes('波士頓棕熊')) return '50630';
  else if (name.includes('費城飛人')) return '52910';
  else if (name.includes('科羅拉多雪崩')) return '51106';
  else if (name.includes('聖路易斯藍調')) return '52911';
  else if (name.includes('多倫多楓葉')) return '52637';
  else if (name.includes('哥倫布藍衣')) return '50629';
  else if (name.includes('溫哥華加人')) return '51660';
  else if (name.includes('明尼蘇達荒野')) return '51107';
  else if (name.includes('華盛頓首都')) return '50632';
  else if (name.includes('維加斯黃金騎士')) return '182221';
  else if (name.includes('達拉斯星')) return '51658';
  // CBA
  else if (name.includes('石家莊永昌')) return '49388';
  else if (name.includes('武漢卓爾')) return '6843';
  else if (name.includes('重慶當代力帆')) return '9570';
  else if (name.includes('河北華夏幸福')) return '11288';
  else if (name.includes('江蘇蘇寧')) return '43805';
  else if (name.includes('山東魯能泰山')) return '11376';
  else if (name.includes('大連人')) return '6833';
  else if (name.includes('河南建業')) return '11283';
  else if (name.includes('北京中赫國安')) return '9569';
  else if (name.includes('青島黄海青港')) return '5722';
  else if (name.includes('上海上港')) return '9568';
  else if (name.includes('天津泰達')) return '11282';
  else if (name.includes('深圳佳兆業')) return '5723';
  else if (name.includes('廣州恒大')) return '11289';
  else if (name.includes('上海綠地申花')) return '43807';
  else if (name.includes('廣州富力')) return '43806';
  // 英超
  else if (name.includes('曼聯')) return '10899';
  else if (name.includes('白禮頓')) return '17161';
  else if (name.includes('狼隊')) return '17383';
  else if (name.includes('曼城')) return '708';
  else if (name.includes('阿斯頓維拉')) return '43850';
  else if (name.includes('謝菲爾德聯')) return '3013';
  else if (name.includes('富勒姆')) return '17170';
  else if (name.includes('阿仙奴')) return '17230';
  else if (name.includes('水晶宮')) return '17189';
  else if (name.includes('修咸頓')) return '17231';
  else if (name.includes('利物浦')) return '23451';
  else if (name.includes('列斯聯')) return '17175';
  else if (name.includes('韋斯咸')) return '709';
  else if (name.includes('紐卡斯爾聯')) return '23478';
  else if (name.includes('西布朗')) return '331';
  else if (name.includes('李斯特城')) return '23452';
  else if (name.includes('托特納姆熱刺')) return '17212';
  else if (name.includes('愛華頓')) return '44249';
  else if (name.includes('般尼')) return '17159';
  else if (name.includes('車路士')) return '44000';
  // 法甲
  else if (name.includes('波爾多')) return '347';
  else if (name.includes('南特')) return '348';
  else if (name.includes('迪安')) return '5134';
  else if (name.includes('昂熱')) return '27217';
  else if (name.includes('利爾')) return '27254';
  else if (name.includes('雷恩')) return '44004';
  else if (name.includes('摩納哥')) return '1228';
  else if (name.includes('蘭斯')) return '9901';
  else if (name.includes('洛里昂')) return '27255';
  else if (name.includes('里昂')) return '19668';
  else if (name.includes('史特拉斯堡')) return '44251';
  else if (name.includes('奈梅斯')) return '9904';
  else if (name.includes('布雷斯特')) return '9924';
  else if (name.includes('梅斯')) return '43927';
  else if (name.includes('蒙彼利埃')) return '27258';
  else if (name.includes('聖伊天')) return '714';
  else if (name.includes('朗斯')) return '9899';
  else if (name.includes('巴黎聖日門')) return '1229';
  else if (name.includes('馬賽')) return '44166';
  else if (name.includes('尼斯')) return '44165';
  else if (name.includes('亞眠')) return '9919';
  // 西班牙甲組聯賽
  else if (name.includes('西維爾')) return '1375';
  else if (name.includes('基達菲')) return '2971';
  else if (name.includes('巴塞隆拿')) return '1211';
  else if (name.includes('艾爾切')) return '6364';
  else if (name.includes('皇家馬德里')) return '17163';
  else if (name.includes('馬德里體育會')) return '10269';
  else if (name.includes('伊巴')) return '4442';
  else if (name.includes('切爾達')) return '10268';
  else if (name.includes('格拉納達')) return '993';
  else if (name.includes('畢爾巴鄂競技')) return '1210';
  else if (name.includes('卡迪斯')) return '1384';
  else if (name.includes('奧薩蘇納')) return '17164';
  else if (name.includes('艾拉維斯')) return '974';
  else if (name.includes('皇家貝迪斯')) return '43940';
  else if (name.includes('巴拉多利德')) return '1291';
  else if (name.includes('皇家蘇斯達')) return '6303';
  else if (name.includes('維拉利爾')) return '1374';
  else if (name.includes('韋斯卡')) return '1060';
  else if (name.includes('華倫西亞')) return '43939';
  else if (name.includes('利雲特')) return '1056';
  // 意大利甲組聯賽
  else if (name.includes('帕爾馬')) return '6396';
  else if (name.includes('博洛尼亞')) return '1231';
  else if (name.includes('拿玻里')) return '29126';
  else if (name.includes('熱拿亞')) return '1275';
  else if (name.includes('克努托内')) return '1274';
  else if (name.includes('AC米蘭')) return '43866';
  else if (name.includes('烏甸尼斯')) return '1238';
  else if (name.includes('費倫天拿')) return '1280';
  else if (name.includes('拖連奴')) return '1230';
  else if (name.includes('維羅納')) return '7311';
  else if (name.includes('羅馬')) return '1273';
  else if (name.includes('祖雲達斯')) return '22228';
  else if (name.includes('斯佩齊亞')) return '7315';
  else if (name.includes('薩斯索羅')) return '1278';
  else if (name.includes('卡利亞里')) return '1272';
  else if (name.includes('拉素')) return '43865';
  else if (name.includes('森多利亞')) return '1276';
  else if (name.includes('班尼雲度')) return '7317';
  else if (name.includes('阿特蘭大')) return '1277';
  else if (name.includes('國際米蘭')) return '890';
  // 德國甲組聯賽
  else if (name.includes('雲達不萊梅')) return '43932';
  else if (name.includes('慕遜加柏')) return '4806';
  else if (name.includes('柏林聯')) return '258';
  else if (name.includes('美因茨05')) return '4283';
  else if (name.includes('斯圖加特')) return '9821';
  else if (name.includes('勒沃庫森')) return '15897';
  else if (name.includes('RB萊比錫')) return '823';
  else if (name.includes('比勒費爾德')) return '257';
  else if (name.includes('科隆')) return '16006';
  else if (name.includes('奧斯堡')) return '43933';
  else if (name.includes('多特蒙德')) return '23475';
  else if (name.includes('費雷堡')) return '476';
  else if (name.includes('沃爾夫斯堡')) return '16005';
  else if (name.includes('霍芬海姆')) return '822';
  else if (name.includes('拜仁慕尼黑')) return '9943';
  else if (name.includes('史浩克04')) return '9942';
  else if (name.includes('柏林赫塔')) return '475';
  else if (name.includes('法蘭克福')) return '16016';
  // 荷蘭甲組聯賽
  else if (name.includes('阿爾克馬爾')) return '698';
  else if (name.includes('海倫維恩')) return '29096';
  else if (name.includes('威廉二世')) return '23727';
  else if (name.includes('茲沃勒')) return '23654';
  else if (name.includes('費耶諾德')) return '43767';
  else if (name.includes('特溫特')) return '29097';
  else if (name.includes('錫塔德命運')) return '44253';
  else if (name.includes('埃門')) return '9910';
  else if (name.includes('芬洛')) return '9913';
  else if (name.includes('烏德勒支')) return '4241';
  else if (name.includes('鹿特丹斯巴達')) return '43860';
  else if (name.includes('阿賈克斯')) return '344';
  else if (name.includes('赫拉克勒斯')) return '342';
  else if (name.includes('海牙')) return '341';
  else if (name.includes('格羅寧根')) return '220';
  else if (name.includes('PSV埃因霍溫')) return '219';
  else if (name.includes('瓦爾維克')) return '9917';
  else if (name.includes('維迪斯')) return '43996';
  // 葡萄牙超級聯賽 剩 15/18 組
  else if (name.includes('博阿維斯塔')) return '700';
  else if (name.includes('波爾圖')) return '1047';
  else if (name.includes('波蒂蒙尼斯')) return '728';
  else if (name.includes('費雷拉')) return '43770';
  else if (name.includes('莫雷倫斯')) return '704';
  else if (name.includes('法倫斯')) return '973';
  else if (name.includes('費馬利卡奧')) return '923';
  else if (name.includes('本菲卡')) return '9987';
  else if (name.includes('甘馬雷斯')) return '31105';
  else if (name.includes('比蘭尼塞斯')) return '19658';
  else if (name.includes('布拉加')) return '44094';
  else if (name.includes('聖塔克萊拉')) return '1166';
  else if (name.includes('托德拉')) return '44255';
  else if (name.includes('里奧阿維')) return '1336';
  else if (name.includes('馬里迪莫')) return '705';

  // ---
  // 士砵亭
  // 艾維斯
  // 馬里迪莫
  // 塞圖巴爾
  // ---

  // 澳足 尚未開打

  // 日本J1聯賽 日甲
  else if (name.includes('大分三神')) return '43650';
  else if (name.includes('廣島三箭')) return '3366';
  else if (name.includes('東京')) return '3399';
  else if (name.includes('大阪櫻花')) return '5653';
  else if (name.includes('鹿島鹿角')) return '5620';
  else if (name.includes('湘南比馬')) return '5657';
  else if (name.includes('神護勝利船')) return '3368';
  else if (name.includes('名古屋鯨魚')) return '5562';
  else if (name.includes('北海道札幌岡薩多')) return '5395';
  else if (name.includes('大阪飛腳')) return '3367';
  else if (name.includes('鳥栖沙岩')) return '5654';
  else if (name.includes('橫濱水手')) return '3365';
  else if (name.includes('柏雷素爾')) return '5560';
  else if (name.includes('川崎前鋒')) return '5640';
  else if (name.includes('橫濱')) return '5619';
  else if (name.includes('清水心跳')) return '43733';
  else if (name.includes('浦和紅鑽')) return '3369';
  else if (name.includes('仙台維加泰')) return '5644';
  // 韓足
  else if (name.includes('首爾')) return '183';
  else if (name.includes('水原三星')) return '182';
  else if (name.includes('江原')) return '44269';
  else if (name.includes('浦項制鐵')) return '10236';
  else if (name.includes('釜山偶像')) return '1729';
  else if (name.includes('仁川聯隊')) return '44688';
  else if (name.includes('光州')) return '43711';
  else if (name.includes('全北現代')) return '184';
  else if (name.includes('尚州尚武')) return '181';
  else if (name.includes('城南足球俱樂部')) return '44689';
  else if (name.includes('蔚山現代')) return '43710';
  else if (name.includes('大邱')) return '47445';

  // 歐冠杯

  // 歐洲杯
  else {
    return name;
  }
}
module.exports = { getToken, getHandicap };
