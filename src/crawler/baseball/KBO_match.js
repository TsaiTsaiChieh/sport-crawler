const configs = require('../../configs/league/KBO_configs');
const { getData } = require('../../helpers/invokeUtil');
const momentUtil = require('../../helpers/momentUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const { KBO_teamName2id } = require('../../helpers/teamsMapping');
const html2json = require('html2json').html2json;
const { MATCH_STATUS } = require('../../helpers/statusUtil');
const { updateMatchChunk2MySQL } = require('../../helpers/databaseEngine');

async function main() {
  try {
    let { matchURL, date, league, league_id, sport_id, ori_league_id } = configs;
    date = momentUtil.timestamp2date(Date.now(), { op: 'add', value: 1, unit: 'days', format: 'YYYY-MM-DD' });
    const URL = `${matchURL}${date}`;
    const data = await getData(URL);
    const matchChunk = await repackageMatch(data);
    await updateMatchChunk2MySQL(matchChunk, { league, league_id, sport_id, ori_league_id });

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

async function repackageMatch(matchData) {
  try {
    const data = [];
    const json = html2json(matchData);
    json.child.map(function(ele, i) {
      if (i % 2 === 0) {
        const matchId = hrefReplacement(ele.attr.href);
        const scheduled = momentUtil.date2timestamp(ele.child[5].child[1].child[3].attr.datetime);
        const awayAlias = ele.child[3].child[1].attr.class[1];
        const homeAlias = ele.child[7].child[1].attr.class[1];
        data.push({
          matchId,
          scheduled,
          homeId: KBO_teamName2id(homeAlias),
          homeAlias,
          awayId: KBO_teamName2id(awayAlias),
          awayAlias,
          status: MATCH_STATUS.SCHEDULED
        });
      }
    });
    return Promise.resolve(data);
  } catch (err) {
    return Promise.reject(new ServerErrors.RepackageError(err.stack));
  }
}

function hrefReplacement(str) {
  const index = str.indexOf('-');
  return str.substring(7, index);
}

module.exports = main;
