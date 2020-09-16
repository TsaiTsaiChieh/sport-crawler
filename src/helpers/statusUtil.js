const MATCH_STATUS = { SCHEDULED: 2, INPLAY: 1, END: 0, ABNORMAL: -1, VALID: 1, POSTPONED: -2, CANCELLED: -3, TBD: -10 };

function MLB_statusMapping(status) {
  switch (status) {
    case 'S':
      return MATCH_STATUS.SCHEDULED;
    case 'I':
      return MATCH_STATUS.INPLAY;
    case 'F':
      return MATCH_STATUS.END;
    case 'D':
      return MATCH_STATUS.POSTPONED;
    default:
      throw new Error(`Unknown status: ${status} in MLB`);
  }
}

module.exports = {
  MATCH_STATUS,
  MLB_statusMapping
};
