const MATCH_STATUS = { SCHEDULED: 2, INPLAY: 1, END: 0, ABNORMAL: -1, VALID: 1, POSTPONED: -2, CANCELLED: -3, TBD: -10 };
const MATCH_STATUS_REALTIME = { 2: 'scheduled', 1: 'inprogress', 0: 'closed' };

function MLB_statusMapping(matchId, status) {
  const { detailedStatus, codedGameState, abstractGameCode, statusCode } = status;
  if (statusCode === 'PR') return MATCH_STATUS.POSTPONED;
  if (abstractGameCode === 'P') return MATCH_STATUS.SCHEDULED;
  else if (abstractGameCode === 'L') return MATCH_STATUS.INPLAY;
  else if ((abstractGameCode === 'F' && codedGameState === 'F') || (abstractGameCode === 'F' && codedGameState === 'O')) return MATCH_STATUS.END;
  else if (abstractGameCode === 'F' && codedGameState === 'D') return MATCH_STATUS.POSTPONED;
  // else return MATCH_STATUS.TBD;
  throw new Error(`MLB 比賽編號: ${matchId} 的未知狀態: ${abstractGameCode}(${detailedStatus})`);
}

module.exports = {
  MATCH_STATUS,
  MATCH_STATUS_REALTIME,
  MLB_statusMapping
};
