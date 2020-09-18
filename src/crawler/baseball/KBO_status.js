const configs = require('../../configs/league/KBO_configs');
const { getData } = require('../../helpers/invokeUtil');
const momentUtil = require('../../helpers/momentUtil');
const ServerErrors = require('../../helpers/ServerErrors');
const html2json = require('html2json').html2json;
const { MATCH_STATUS } = require('../../helpers/statusUtil');
const { getScheduledAndInplayMatchesFromMySQL } = require('../../helpers/databaseEngine');
const mysql = require('../../helpers/mysqlUtil');

async function main() {
  try {
    const nowUnix = Math.floor(Date.now() / 1000);
    const { league_id } = configs;
    const matchData = await getScheduledAndInplayMatchesFromMySQL(nowUnix, league_id);
    if (matchData.length) await invokeAPI(matchData);

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

async function invokeAPI() {
  let { matchURL, date } = configs;
  date = momentUtil.timestamp2date(Date.now(), { format: 'YYYY-MM-DD' });
  const URL = `${matchURL}${date}`;
  const data = await getData(URL);
  const matchChunk = await repackageMatchData(data);
  await updateStatus2MySQL(matchChunk);
}

async function repackageMatchData(matchData) {
  try {
    const data = [];
    const json = html2json(matchData);
    json.child.map(function(ele, i) {
      if (i % 2 === 0) {
        let status = MATCH_STATUS.SCHEDULED;
        const matchId = hrefReplacement(ele.attr.href);
        const inningText = ele.child[5].child[3].child[0].text;
        const replaceText = inningText.replace(/\n/g, '');
        // const final = ele.child[5].
        if (replaceText) status = MATCH_STATUS.INPLAY;
        if (replaceText === 'Final') status = MATCH_STATUS.END;
        data.push({
          matchId,
          status
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

async function updateStatus2MySQL(matchChunk) {
  try {
    matchChunk.map(async function(match) {
      await mysql.Match.update({ status: match.status }, { where: { bets_id: match.matchId } });
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}
module.exports = main;
