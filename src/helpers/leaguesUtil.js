const MATCH_STATUS = { SCHEDULED: 2, INPLAY: 1, END: 0, ABNORMAL: -1, VALID: 1, POSTPONED: -2, CANCELLED: -3 };

function league2Sport(league) {
  switch (league) {
    case 'MLB':
    case 'CPBL':
    case 'KBO':
    case 'NPB':
    case 'ABL':
    case 'LMB':
      return {
        sport: 'baseball',
        sport_id: 16
      };
    case 'NBA':
    case 'SBL':
    case 'WNBA':
    case 'NBL':
    case 'KBL':
    case 'CBA':
    case 'BJL':
      return {
        sport: 'basketball',
        sport_id: 18
      };
    case 'NHL':
      return {
        sport: 'icehockey',
        sport_id: 17
      };
    case 'Soccer':
      return {
        sport: 'soccer',
        sport_id: 1
      };
    case 'eSoccer':
      return {
        sport: 'esports',
        sport_id: 22
      };
    default:
      throw new Error('Unknown league');
  }
}

function leagueCodebook(league) {
  switch (league) {
    case 'NBA':
      return {
        id: '2274',
        name_ch: '美國國家籃球協會',
        ori_league_id: '2274',
        hw_ball: '6'
      };
    case 'SBL':
      return {
        id: '8251',
        name_ch: '超級籃球聯賽',
        ori_league_id: '8251',
        hw_ball: ''
      };
    case 'WNBA':
      return {
        id: '244',
        name_ch: '美國國家女子籃球協會',
        hw_ball: ''
      };
    case 'NBL':
      return {
        id: '1714',
        name_ch: '澳洲職籃',
        hw_ball: ''
      };
    case 'CBA':
      return {
        id: '2319',
        name_ch: '中國職籃',
        hw_ball: ''
      };
    case 'KBL':
      return {
        id: '2148',
        name_ch: '韓國職籃',
        hw_ball: ''
      };
    case 'BJL':
      return {
        id: '1298',
        name_ch: '日本職籃',
        hw_ball: ''
      };
    case 'MLB':
      return {
        id: '3939',
        name_ch: '美國職棒大聯盟',
        hw_ball: '1',
        ori_league_id: '225'
      };
    case 'NPB':
      return {
        id: '347',
        name_ch: '日本職棒',
        hw_ball: '2'
      };
    case 'CPBL':
      return {
        id: '11235',
        name_ch: '中華職棒',
        ori_league_id: '11235',
        hw_ball: '3'
      };
    case 'KBO':
      return {
        id: '349',
        name_ch: '韓國職棒',
        hw_ball: '4',
        ori_league_id: '349'
      };
    case 'ABL':
      return {
        id: '2759',
        name_ch: '澳洲職棒',
        hw_ball: ''
      };
    case 'LMB':
      return {
        id: '4412',
        name_ch: '墨西哥職棒',
        hw_ball: ''
      };
    case 'NHL':
      return {
        id: '1926',
        name_ch: '國家冰球聯盟',
        hw_ball: '5'
      };
    case 'Soccer':
      return {
        id: '8',
        name_ch: '足球',
        hw_ball: '10'
      };
    case 'eSoccer':
      return {
        id: '22000',
        name_ch: '足球電競',
        hw_ball: ''
      };
    case 'eGame':
      return {
        id: '23000',
        name_ch: '電競遊戲',
        hw_ball: ''
      };
    default:
      throw new Error('Unknown league');
  }
}

module.exports = {
  MATCH_STATUS,
  league2Sport,
  leagueCodebook
};
