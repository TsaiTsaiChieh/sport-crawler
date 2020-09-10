const { set2realtime } = require('../../helpers/firebaseUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const matchStatus = { 3: 'ended', 2: 'inprogress', 1: 'scheduled' };
// const realtime = firebaseAdmin().database();
const configs = {
  league: 'NBA',
  sport: 'basketball',
  API: 'https://tw.global.nba.com/stats2/game/playbyplay.json',
  gameId: '0041900234',
  period: 0,
  locale: process.env.locale
};

async function main() {
  try {
    // TODO get game id from MySQL
    const { league, sport, API, gameId, locale } = configs;
    const URL = `${API}?gameId=${gameId}&locale=${locale}`;
    const data = await getData(URL);
    const matchChunk = await repackageMatches(data);
    const path = `${sport}/${league}/${gameId}`;
    await set2realtime(path, matchChunk);
    console.log(matchChunk);
  } catch (err) {
    console.log(err);
    return err;
  }
}
// 全部更新
async function repackageMatches(matchData) {
  try {
    const { payload } = matchData;
    const playByPlays = payload.playByPlays;

    if (playByPlays.length) {
      const nowPeriod = payload.boxscore.period;
      const clock = !payload.boxscore.periodClock ? '0:00' : payload.boxscore.periodClock;
      const eventOrderAtNowPeriod = payload.playByPlays[0].events.length;
      const Summary = {
        Now_clock: clock,
        Now_periods: nowPeriod,
        Now_event_order: eventOrderAtNowPeriod,
        status: matchStatus[payload.boxscore.status],
        info: {
          away: { Total: { points: payload.boxscore.awayScore } },
          home: { Total: { points: payload.boxscore.homeScore } }
        }
      };

      const awayId = payload.gameProfile.awayTeamId;
      const homeId = payload.gameProfile.homeTeamId;

      for (let i = 0; i < playByPlays.length; i++) {
        const period = playByPlays[i].period;
        Summary.info.away[`periods${period}`] = {};
        Summary.info.home[`periods${period}`] = {};
        Summary[`periods${period}`] = {};
        // Subtract the points from the previous round
        const awayScoreTmp = parseInt(playByPlays[i].events[playByPlays[i].events.length - 1].awayScore);
        const homeScoreTmp = parseInt(playByPlays[i].events[playByPlays[i].events.length - 1].homeScore);

        for (let j = playByPlays[i].events.length; j > 0; j--) {
          const event = playByPlays[i].events[j - 1];
          const awayScore = parseInt(event.awayScore) - awayScoreTmp;
          const homeScore = parseInt(event.homeScore) - homeScoreTmp;
          Summary.info.away[`periods${period}`].points = String(awayScore);
          Summary.info.home[`periods${period}`].points = String(homeScore);
          let descriptionCh = filterSymbol(event.description, ']');
          if (event.messageType === '12') descriptionCh = replaceDescription(period, '開始');
          if (event.messageType === '13') descriptionCh = replaceDescription(period, '結束');
          Summary[`periods${period}`][`events${playByPlays[i].events.length - j + 1}`] = {
            Period: period,
            Clock: event.gameClock,
            attribution: messageTypeMapping(event.teamId, awayId, homeId),
            description_ch: descriptionCh
          };
        }
      }
      return Promise.resolve({ Summary });
    }
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

// 部分更新
// async function repackageMatches(matchData) {
//   try {
//     const { payload } = matchData;
//     if (payload) {
//       const nowPeriod = payload.boxscore.period;
//       const clock = !payload.boxscore.periodClock ? '0:00' : payload.boxscore.periodClock;
//       const eventOrderAtNowPeriod = payload.playByPlays[0].events.length;
//       const Summary = {
//         Now_clock: clock,
//         Now_periods: nowPeriod,
//         Now_event_order: eventOrderAtNowPeriod,
//         status: matchStatus[payload.boxscore.status]
//         // info: {
//         //   away: { Total: {} },
//         //   home: { Total: {} }
//         // }
//       };
//       const event = payload.playByPlays[0].events[0];
//       const { gameClock, teamId } = event;
//       const awayId = payload.gameProfile.awayTeamId;
//       const homeId = payload.gameProfile.homeTeamId;
//       Summary[`periods${nowPeriod}`] = {};
//       Summary[`periods${nowPeriod}`][`events${eventOrderAtNowPeriod + 1}`] = {
//         Period: nowPeriod,
//         Clock: gameClock,
//         attribution: messageTypeMapping(teamId, awayId, homeId),
//         description_ch: event.description
//       };
//       return Promise.resolve(Summary);
//     }
//     return Promise.resolve();
//   } catch (err) {
//     return Promise.reject(new ServerErrors.RepackageError(err.stack));
//   }
// }

function messageTypeMapping(teamId, awayId, homeId) {
  if (teamId === awayId) return 'away';
  else if (teamId === homeId) return 'home';
  else return 'common';
}

function filterSymbol(str, symbol) {
  const index = str.indexOf(symbol);
  return str.substring(index + 1).trim();
}

function replaceDescription(period, append) {
  return `第${period}節${append}`;
}
module.exports = main;
