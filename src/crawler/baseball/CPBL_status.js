// const configs = require('../../configs/league/CPBL_configs');
// const momentUtil = require('../../helpers/momentUtil');
// const { getScheduledAndInplayMatchesFromMySQL } = require('../../helpers/databaseEngine');
// const { crawler } = require('../../helpers/invokeUtil');

// async function main() {
//   try {
//     const { league_id } = configs;
//     const nowUnix = Math.floor(Date.now() / 1000);
//     // const matchData = await getScheduledAndInplayMatchesFromMySQL(nowUnix, league_id);
//     const matchData = [{
//       matchId: '2020092511235G211',
//       status: 2,
//       scheduled: 1601030100,
//       scheduled_tw: '2020-09-25T10:35:00.000Z',
//       homeId: '329121',
//       homeAlias: 'Rakuten Monkeys',
//       awayId: '230422',
//       awayAlias: 'CTBC Brothers'
//     },
//     {
//       matchId: '2020092511235G212',
//       status: 2,
//       scheduled: 1601030100,
//       scheduled_tw: '2020-09-25T10:35:00.000Z',
//       homeId: '224095',
//       homeAlias: 'Uni-President Lions',
//       awayId: '224094',
//       awayAlias: 'Fubon Guardians'
//     }];
//     if (matchData.length) await crawlerURL(matchData);
//   } catch (err) {
//     return Promise.reject(err.stack);
//   }
// }

// async function crawlerURL(matchData) {
//   try {
//     const { livescoreURL, lang, ball } = configs;
//     const URL = `${livescoreURL}?lang=${lang}&ball=${ball}`;
//     const $ = await crawler(URL);
//     await repackageStatusData($);
//     // console.log(data);
//     return Promise.resolve();
//   } catch (err) {
//     return Promise.reject(err.stack);
//   }
// }

// async function repackageStatusData($) {
//   try {
//     $('tbody').each(function(i) {
//       console.log($(this).text);
//     });
//   } catch (err) {
//     return Promise.reject(err.stack);
//   }
// }

// module.exports = main;
