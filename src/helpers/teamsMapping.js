function NBA_teamName2id(team) {
  switch (team) {
    case 'CLE Cavaliers':
    case 'CLE':
      return '55277';
    case 'PHI 76ers':
    case 'PHI':
      return '53954';
    case 'MIA Heat':
    case 'MIA':
      return '57721';
    case 'CHI Bulls':
    case 'CHI':
      return '52914';
    case 'DET Pistons':
    case 'DET':
      return '56737';
    case 'CHA Hornets':
    case 'CHA':
      return '58265';
    case 'BKN Nets':
    case 'BKN':
      return '54759';
    case 'ORL Magic':
    case 'ORL':
      return '56088';
    case 'MIL Bucks':
    case 'MIL':
      return '52913';
    case 'NY Knicks':
    case 'NYK':
      return '54760';
    case 'ATL Hawks':
    case 'ATL':
      return '55278';
    case 'BOS Celtics':
    case 'BOS':
      return '56280';
    case 'TOR Raptors':
    case 'TOR':
      return '53768';
    case 'IND Pacers':
    case 'IND':
      return '54763';
    case 'WAS Wizards':
    case 'WAS':
      return '53953';
    case 'HOU Rockets':
    case 'HOU':
      return '52640';
    case 'GS Warriors':
    case 'GSW':
      return '53390';
    case 'MEM Grizzlies':
    case 'MEM':
      return '58056';
    case 'LA Lakers':
    case 'LAL':
      return '54379';
    case 'SAC Kings':
    case 'SAC':
      return '55290';
    case 'SA Spurs':
    case 'SAS':
      return '56087';
    case 'POR Trail Blazers':
    case 'POR':
      return '55868';
    case 'MIN Timberwolves':
    case 'MIN':
      return '58057';
    case 'LA Clippers':
    case 'LAC':
      return '53389';
    case 'NO Pelicans':
    case 'NOP':
      return '54878';
    case 'DAL Mavericks':
    case 'DAL':
      return '58479';
    case 'PHX Suns':
    case 'PHX':
      return '56107';
    case 'UTA Jazz':
    case 'UTA':
      return '55289';
    case 'OKC Thunder':
    case 'OKC':
      return '52891';
    case 'DEN Nuggets':
    case 'DEN':
      return '54378';
    default:
      throw new Error('Invalid parameter');
  }
}

module.exports = {
  NBA_teamName2id
};
