const mysql = require('./mysqlUtil');
const ServerErrors = require('./ServerErrors');
const { MATCH_STATUS } = require('./statusUtil');
const { set2realtime } = require('./firebaseUtil');
const momentUtil = require('./momentUtil');

async function getScheduledAndInplayMatchesFromMySQL(nowUnix, leagueId) {
  try {
    const yesterday = nowUnix - 24 * 60 * 60;
    // Index is range, taking about 170ms
    const result = await mysql.sequelize.query(`
    SELECT game.bets_id AS matchId, game.status, game.scheduled, game.scheduled_tw, 
	         home.team_id AS homeId, home.alias AS homeAlias, 
	         away.team_id AS awayId, away.alias AS awayAlias
      FROM matches AS game
 LEFT JOIN match__teams AS home ON game.home_id = home.team_id
 LEFT JOIN match__teams AS away ON game.away_id = away.team_id
     WHERE game.league_id = :league_id
       AND (status = :SCHEDULED OR status = :INPLAY)
       AND (scheduled <= :nowUnix AND scheduled >= :yesterday)`, {
      replacements: {
        league_id: leagueId,
        SCHEDULED: MATCH_STATUS.SCHEDULED,
        INPLAY: MATCH_STATUS.INPLAY,
        nowUnix,
        yesterday
      },
      raw: true,
      type: mysql.sequelize.QueryTypes.SELECT
    });
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

async function getTomorrowScheduledMatchesFromMySQL(date, leagueId) {
  try {
    const begin = momentUtil.date2unix(date, { op: 'add', value: 1, unit: 'days' });
    const end = momentUtil.date2unix(date, { op: 'add', value: 2, unit: 'days' }) - 1;
    // Index is range or eq_ref, taking about 170ms
    const result = await mysql.sequelize.query(`
    SELECT game.bets_id AS matchId, game.status, game.scheduled, game.scheduled_tw, 
	         home.team_id AS homeId, home.alias AS homeAlias, 
	         away.team_id AS awayId, away.alias AS awayAlias
      FROM matches AS game
 LEFT JOIN match__teams AS home ON game.home_id = home.team_id
 LEFT JOIN match__teams AS away ON game.away_id = away.team_id
     WHERE game.league_id = :league_id
       AND game.status = :SCHEDULED
       AND game.scheduled BETWEEN :begin AND :end`, {
      replacements: {
        league_id: leagueId,
        SCHEDULED: MATCH_STATUS.SCHEDULED,
        begin,
        end
      },
      raw: true,
      type: mysql.sequelize.QueryTypes.SELECT
    });
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

async function updateMatchChunk2MySQL(data, configs) {
  try {
    const { league, league_id, sport_id, ori_league_id } = configs;
    data.map(async function(ele) {
      await mysql.Match.upsert({
        bets_id: ele.matchId,
        league_id: league_id,
        sport_id: sport_id,
        home_id: ele.homeId,
        away_id: ele.awayId,
        scheduled: ele.scheduled / 1000,
        scheduled_tw: ele.scheduled,
        flag_prematch: MATCH_STATUS.VALID,
        status: ele.status,
        ori_league_id: ori_league_id,
        ori_sport_id: sport_id
      });
      console.log(`更新 ${league}: ${ele.matchId} - ${ele.awayAlias}(${ele.awayId}) vs ${ele.homeAlias}(${ele.homeId}) 成功`);
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.MySQLError(err.stack));
  }
}

async function updateMatchChunk2Realtime(data, configs) {
  const { league, sport } = configs;
  const path = `${sport}/${league}`;
  try {
    data.map(async function(ele) {
      await set2realtime(`${path}/${ele.matchId}/Summary/status`, { status: ele.status });
    });
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(new ServerErrors.RealtimeError(err.stack));
  }
}

async function updateLiveAndTeamData(livescoreData, configs) {
  const { sport, league } = configs;
  livescoreData.map(async function(ele) {
    const path = `${sport}/${league}/${ele.matchId}/Summary`;
    await set2realtime(`${path}/Now_innings`, ele.innings);
    // 壘板
    await set2realtime(`${path}/Now_firstbase`, ele.firstBase);
    await set2realtime(`${path}/Now_secondbase`, ele.secondBase);
    await set2realtime(`${path}/Now_thirdbase`, ele.thirdBase);
    // 計分板
    await set2realtime(`${path}/Now_balls`, ele.balls);
    await set2realtime(`${path}/Now_outs`, ele.outs);
    await set2realtime(`${path}/Now_strikes`, ele.strikes);
    await set2realtime(`${path}/Now_halfs`, ele.halfs);
    await set2realtime(`${path}/status`, String(ele.status));
    await set2realtime(`${path}/info/home/Total/points`, String(ele.Total.home.R));
    await set2realtime(`${path}/info/away/Total/points`, String(ele.Total.away.R));
    await set2realtime(`${path}/info/home/Total/hits`, String(ele.Total.home.H));
    await set2realtime(`${path}/info/away/Total/hits`, String(ele.Total.away.H));
    await set2realtime(`${path}/info/home/Total/errors`, String(ele.Total.home.E));
    await set2realtime(`${path}/info/away/Total/errors`, String(ele.Total.away.E));

    for (const key in ele.home) await set2realtime(`${path}/info/home/${key}/scoring/runs`, ele.home[key].runs);
    for (const key in ele.away) await set2realtime(`${path}/info/away/${key}/scoring/runs`, ele.away[key].runs);
  });
}
module.exports = {
  getScheduledAndInplayMatchesFromMySQL,
  getTomorrowScheduledMatchesFromMySQL,
  updateMatchChunk2MySQL,
  updateMatchChunk2Realtime,
  updateLiveAndTeamData
};
