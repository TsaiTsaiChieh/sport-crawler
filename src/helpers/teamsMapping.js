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

function MLB_teamName2id(name) {
  name = name.toLowerCase().trim();
  switch (name) {
    case 'houston astros':
    case 'hou':
      return { statId: '117', id: '1217' };
    case 'oakland athletics':
    case 'oak':
      return { statId: '113', id: '1222' };
    case 'seattle mariners':
    case 'sea':
      return { statId: '136', id: '1202' };
    case 'los angeles angels':
    case 'ana':
    case 'laa':
      return { statId: '108', id: '1090' };
    case 'texas rangers':
    case 'tex':
      return { statId: '140', id: '1311' };
    case 'new york yankees':
    case 'nya':
    case 'nyy':
      return { statId: '147', id: '1121' };
    case 'baltimore orioles':
    case 'bal':
      return { statId: '110', id: '1120' };
    case 'tampa bay rays':
    case 'tba':
    case 'tb':
      return { statId: '139', id: '1216' };
    case 'toronto blue jays':
    case 'tor':
      return { statId: '141', id: '1089' };
    case 'boston red sox':
    case 'bos':
      return { statId: '111', id: '1479' };
    case 'minnesota twins':
    case 'min':
      return { statId: '142', id: '1088' };
    case 'detroit tigers':
    case 'det':
      return { statId: '116', id: '1091' };
    case 'cleveland indians':
    case 'cle':
      return { statId: '114', id: '1310' };
    case 'chicago white sox':
    case 'cha':
    case 'chs':
    case 'cws':
      return { statId: '145', id: '1203' };
    case 'kansas city royals':
    case 'kca':
    case 'kc':
      return { statId: '118', id: '1478' };
    case 'chicago cubs':
    case 'chn':
    case 'chc':
      return { statId: '112', id: '1368' };
    case 'milwaukee brewers':
    case 'mil':
      return { statId: '158', id: '1187' };
    case 'st. louis cardinals':
    case 'sln':
    case 'stl':
      return { statId: '138', id: '1223' };
    case 'cincinnati reds':
    case 'cin':
      return { statId: '113', id: '1364' };
    case 'pittsburgh pirates':
    case 'pit':
      return { statId: '134', id: '1186' };
    case 'colorado rockies':
    case 'col':
      return { statId: '115', id: '1146' };
    case 'los angeles dodgers':
    case 'lan':
    case 'lad':
      return { statId: '119', id: '1369' };
    case 'san diego padres':
    case 'sdn':
    case 'sd':
      return { statId: '135', id: '1108' };
    case 'san francisco giants':
    case 'sfn':
    case 'sf':
      return { statId: '137', id: '1353' };
    case 'arizona diamondbacks':
    case 'ari':
      return { statId: '109', id: '1365' };
    case 'atlanta braves':
    case 'atl':
      return { statId: '144', id: '1352' };
    case 'miami marlins':
    case 'mia':
    case 'fla':
      return { statId: '146', id: '1109' };
    case 'washington nationals':
    case 'was':
    case 'wah':
    case 'wsh':
      return { statId: '120', id: '1147' };
    case 'philadelphia phillies':
    case 'phi':
      return { statId: '143', id: '1112' };
    case 'new york mets':
    case 'nyn':
    case 'nym':
      return { statId: '121', id: '1113' };
    default:

      return 'Unknown team name in MLB';
  }
}

function CPBL_teamName2id(name) {
  switch (name) {
    case 'AJL011': {
      return '329121';
    }
    case 'E02': {
      return '230422';
    }
    case 'L01': {
      return '224095';
    }
    case 'B04': {
      return '224094';
    }
  }
}

module.exports = {
  NBA_teamName2id,
  MLB_teamName2id,
  CPBL_teamName2id
};
