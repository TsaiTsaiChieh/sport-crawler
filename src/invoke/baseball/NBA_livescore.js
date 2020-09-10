// const firebaseAdmin = require('../../helpers/firebaseUtil');
const { getData } = require('../../helpers/invokeUtil');
const ServerErrors = require('../../helpers/ServerErrors');
// const { endsWith } = require('sequelize/types/lib/operators');
// const matchStatus = { 3: 'end', 2: 'inprogress', 1: 'scheduled' };
// const realtime = firebaseAdmin().database();
const configs = {
  API: 'https://tw.global.nba.com/stats2/game/playbyplay.json',
  gameId: '0041900234',
  period: 0,
  locale: process.env.locale
};

async function main() {
  try {
    // TODO get game id from MySQL

    const { API, gameId, locale } = configs;
    const URL = `${API}?gameId=${gameId}&locale=${locale}`;
    const data = await getData(URL);
    await repackageMatches(data);
    console.log(data);
  } catch (err) {
    return err;
  }
}

async function repackageMatches(matchData) {
  try {
    const { payload } = matchData;
    if (payload) {
      // const nowPeriod = payload.boxscore.period;
      // const eventOrderAtNowPeriod = payload.playByPlays[0].length;
      // const Summary = {
      //   Now_clock: payload.boxscore.periodClock,
      //   Now_periods: nowPeriod,
      //   Now_event_order: eventOrderAtNowPeriod + 1,
      //   status: matchStatus[payload.boxscore],
      //   info: {
      //     away: { Total: {} },
      //     home: { Total: {} }
      //   }
      // };
      // const clock = payload
      // Summary[`periods${nowPeriod}`][`events${eventOrderAtNowPeriod + 1}`] = {
      //   Period: nowPeriod,
      //   Clock:
      // };
    }
    return Promise.resolve(matchData);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

module.exports = main;
