const MATCH_STATUS = { SCHEDULED: 2, INPLAY: 1, END: 0, ABNORMAL: -1, VALID: 1, POSTPONED: -2, CANCELLED: -3, TBD: -10 };

function MLB_statusMapping(matchId, status) {
  const { detailedStatus, codedGameState, abstractGameCode } = status;
  if (abstractGameCode === 'P') return MATCH_STATUS.SCHEDULED;
  else if (abstractGameCode === 'L') return MATCH_STATUS.INPLAY;
  else if ((abstractGameCode === 'F' && codedGameState === 'F') || (abstractGameCode === 'F' && codedGameState === 'O')) return MATCH_STATUS.END;
  else if (abstractGameCode === 'F' && codedGameState === 'D') return MATCH_STATUS.POSTPONED;
  throw new Error(`MLB 比賽編號: ${matchId} 的未知狀態: ${abstractGameCode}(${detailedStatus})`);
}

module.exports = {
  MATCH_STATUS,
  MLB_statusMapping
};
