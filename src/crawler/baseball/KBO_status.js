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
    // TODO get schedule time, date = today, invoke API
    if (matchData.length) await invokeAPI(matchData);

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

async function invokeAPI(matchData) {
  let { matchURL, date } = configs;
  date = momentUtil.timestamp2date(Date.now(), { format: 'YYYY-MM-DD' });
  const URL = `${matchURL}${date}`;
  const data = await getData(URL);
  const gameData = await repackageMatchData(data);
  await updateStatus2MySQL(gameData, matchData);
  await updateScore2MySQL(gameData);
}

async function repackageMatchData(gameData) {
  try {
    const data = [];
    const json = html2json(gameData);
    let awayScore = 0;
    let homeScore = 0;
    json.child.map(function(ele, i) {
      if (i % 2 === 0) {
        let status = MATCH_STATUS.SCHEDULED;
        const matchId = hrefReplacement(ele.attr.href);
        const inningText = ele.child[5].child[3].child[0].text;
        const replaceText = inningText.replace(/\n/g, '');
        if (ele.child[5].child[1].child[1].child) awayScore = ele.child[5].child[1].child[1].child[0].text;
        if (ele.child[5].child[1].child[3].child) homeScore = ele.child[5].child[1].child[3].child[0].text;
        if (replaceText) status = MATCH_STATUS.INPLAY;
        if (replaceText.includes('Final')) status = MATCH_STATUS.END;
        data.push({
          matchId,
          status,
          awayScore,
          homeScore
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

async function updateStatus2MySQL(gameData, matchData) {
  try {
    gameData.map(async function(game) {
      matchData.map(async function(match) {
        if (game.matchId === match.matchId && game.status !== match.status) await mysql.Match.update({ status: game.status }, { where: { bets_id: game.matchId } });
      });
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

async function updateScore2MySQL(matchData) {
  try {
    matchData.map(async function(ele) {
      if (ele.status === MATCH_STATUS.END) {
        await mysql.Match.update({ home_points: ele.homeScore, away_points: ele.awayScore }, { where: { bets_id: ele.matchId } });
      }
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}
module.exports = main;