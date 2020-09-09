const { Sequelize } = require('sequelize');
const Op = Sequelize.Op;
const mysql = require('../configs/mysqlSetting');

const db_name = mysql.setting.db_name.dev;
const db_user = mysql.setting.db_user;
const db_password = mysql.setting.db_password;

// connection setting
const sequelize = new Sequelize(db_name, db_user, db_password, {
  dialect: mysql.setting.dialect,
  host: mysql.setting.host,
  timestamps: true,
  dialectOptions: mysql.setting.dialectOptions,
  pool: mysql.setting.pool,
  logging: false, // disable logging; default: console.log
  timezone: mysql.setting.timezone // for writing to database
});

/*
 * Define schema
 * The model will now be available in models under the name given to define
 * Ex: sequelize.models.match
 * Match ref: match, match__league, match__team, match__spread, match__total
 * User ref: user__prediction, user__prediction__description
 */

/*
 * 使用者資訊
 */
const User = sequelize.define(
  'user',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    status: {
      type: Sequelize.INTEGER
    },
    avatar: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'https://dosports.web.app/statics/default-avatar.jpg'
    },
    birthday: {
      type: Sequelize.INTEGER
    },
    birthday_tw: {
      type: Sequelize.DATE
    },
    display_name: {
      type: Sequelize.STRING
    },
    dividend: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    email: {
      type: Sequelize.STRING
    },
    name: {
      type: Sequelize.STRING
    },
    country_code: {
      type: Sequelize.STRING
    },
    phone: {
      type: Sequelize.STRING
    },
    point: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    signature: {
      type: Sequelize.STRING
    },
    fan_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    default_title: {
      type: Sequelize.STRING
    },
    // 大神 預設 顯示聯盟 有稱號的 (NBA 金  或 MLB 銀)
    default_god_league_rank: {
      type: Sequelize.STRING
    },
    // 改獨立成一個 titles table
    // titles: {
    //   type: Sequelize.STRING
    // },
    accuse_credit: {
      type: Sequelize.INTEGER
    },
    block_count: {
      type: Sequelize.INTEGER
    },
    unread_count: {
      type: Sequelize.INTEGER
    },
    block_message: {
      type: Sequelize.DATE
    },
    coin: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    ingot: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    /* 會員發票載具 */
    invoice_carrier: {
      type: Sequelize.STRING
    },
    deposit_lottery: {
      type: Sequelize.INTEGER
    },
    rank1_count: {
      type: Sequelize.INTEGER
    },
    rank2_count: {
      type: Sequelize.INTEGER
    },
    rank3_count: {
      type: Sequelize.INTEGER
    },
    rank4_count: {
      type: Sequelize.INTEGER
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['uid']
      }
    ]
  }
);

/*
 * 使用者被禁言（聊天室）和次數、水桶（討論區）和次數、禁預（預測賽事）
 * 一旦有被處決才會 insert，非每位使用者都有初始值
 */

const User_Blacklist = sequelize.define('user__blacklist',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    muted_time: {
      type: Sequelize.DATE
    },
    muted_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    bucketed_time: {
      type: Sequelize.DATE
    },
    bucketed_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    banned_time: {
      type: Sequelize.DATE
    },
    banned_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['uid']
      }
    ]
  }
);

/*
 * 帳號禁言記錄
 */
const User_BlockLog = sequelize.define('user__blocklog', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  uid: {
    type: Sequelize.STRING,
    allowNull: false
  },
  newcount: {
    type: Sequelize.INTEGER
  },
  start: {
    type: Sequelize.DATE
  },
  end: {
    type: Sequelize.DATE
  }
});

/*
 * 歷史大神 含 大神戰績資訊
 */
const Title = sequelize.define(
  'title',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    period: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    period_date: {
      type: Sequelize.STRING,
      allowNull: false
    },
    league_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    rank_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    default_title: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    win_bets: {
      // 勝注
      type: Sequelize.FLOAT
    },
    win_rate: {
      // 勝率
      type: Sequelize.FLOAT
    },
    continue: {
      // 連贏 N 天
      type: Sequelize.INTEGER
    },
    predict_rate1: {
      // 近N日 N過 N  // 近N日過 N
      type: Sequelize.INTEGER
    },
    predict_rate2: {
      type: Sequelize.INTEGER
    },
    predict_rate3: {
      type: Sequelize.INTEGER
    },
    win_bets_continue: {
      // 勝注連過 Ｎ日
      type: Sequelize.INTEGER
    },
    matches_rate1: {
      // 近 Ｎ 場過 Ｎ 場
      type: Sequelize.INTEGER
    },
    matches_rate2: {
      type: Sequelize.INTEGER
    },
    matches_continue: {
      // 連贏Ｎ場
      type: Sequelize.INTEGER
    },
    received: {
      // 已閱
      type: Sequelize.INTEGER
    }
  },
  {
    indexes: [
      { fields: ['uid'] },
      { fields: ['period'] },
      { fields: ['period_date'] },
      { fields: ['league_id'] },
      {
        unique: true,
        fields: ['uid', 'period', 'league_id']
      }
    ]
  }
);
const Collection = sequelize.define('user__collection', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  uid: {
    type: Sequelize.STRING,
    allowNull: false
  },
  bets_id: {
    type: Sequelize.STRING,
    allowNull: false
  },
  league_id: {
    type: Sequelize.STRING(8),
    allowNull: false
  },
  scheduled: {
    type: Sequelize.INTEGER
  },
  scheduled_tw: {
    type: Sequelize.DATE
  }
});
const Rank = sequelize.define(
  'user__rank',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    rank_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING
    },
    price: {
      type: Sequelize.INTEGER
    },
    sub_price: {
      type: Sequelize.INTEGER
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['rank_id']
      }
    ]
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['rank_id']
      }
    ]
  }
);

/*
 * 各聯盟資訊，ex: NBA, MLB and so on
 */
const League = sequelize.define(
  'match__league',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    league_id: {
      type: Sequelize.STRING(8),
      allowNull: false
    },
    radar_id: {
      type: Sequelize.STRING
    },
    sport_id: {
      type: Sequelize.INTEGER
    },
    name: {
      type: Sequelize.STRING
    },
    ori_name: {
      type: Sequelize.STRING
    },
    name_ch: {
      type: Sequelize.STRING
    },
    ori_league_id: {
      type: Sequelize.STRING
    },
    ori_sport_id: {
      type: Sequelize.STRING
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['ori_league_id']
      },
      {
        fields: ['league_id']
      },
      {
        fields: ['name']
      }
    ]
  }
);

/*
 * 各讓分資訊，unique key 為賽事 ID + 盤口 ID
 */
const Spread = sequelize.define(
  'match__spread',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    spread_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    match_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    league_id: {
      type: Sequelize.STRING(8)
    },
    handicap: {
      type: Sequelize.FLOAT,
      defaultValue: null
    },
    rate: {
      type: Sequelize.INTEGER
    },
    home_odd: {
      type: Sequelize.FLOAT
    },
    away_odd: {
      type: Sequelize.FLOAT
    },
    home_tw: {
      type: Sequelize.STRING
    },
    away_tw: {
      type: Sequelize.STRING
    },
    add_time: {
      type: Sequelize.DATE
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['spread_id', 'match_id']
      }
    ]
  }
);
/*
 * 各大小分資訊，unique key 為賽事 ID + 盤口 ID
 */
const Totals = sequelize.define(
  'match__total',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    totals_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    match_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    league_id: {
      type: Sequelize.STRING(8)
    },
    handicap: {
      type: Sequelize.FLOAT,
      defaultValue: null
    },
    rate: {
      type: Sequelize.INTEGER
    },
    over_odd: {
      type: Sequelize.FLOAT
    },
    under_odd: {
      type: Sequelize.FLOAT
    },
    over_tw: {
      type: Sequelize.STRING
    },
    add_time: {
      type: Sequelize.DATE
    }
  },
  {
    // composite index
    indexes: [
      {
        unique: true,
        fields: ['totals_id', 'match_id']
      }
    ]
  }
);
/*
 * 各隊伍資訊，unique key 為 team_id
 */
const Team = sequelize.define(
  'match__team',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    team_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    league_id: {
      type: Sequelize.STRING(8)
    },
    sport_id: {
      type: Sequelize.STRING
    },
    radar_id: {
      type: Sequelize.STRING
    },
    name: {
      type: Sequelize.STRING
    },
    name_ch: {
      type: Sequelize.STRING
    },
    image_id: {
      type: Sequelize.STRING
    },
    alias: {
      type: Sequelize.STRING
    },
    alias_ch: {
      type: Sequelize.STRING
    },
    group: {
      type: Sequelize.STRING
    },
    injury: {
      type: Sequelize.TEXT
    },
    information: {
      type: Sequelize.TEXT
    },
    baseball_stats: {
      type: Sequelize.TEXT
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['team_id']
      }
    ]
  }
);

/*
 * 各賽事資訊，unique key 為 bets_id
 */
const Match = sequelize.define(
  'match',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    bets_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    league_id: {
      type: Sequelize.STRING(8)
    },
    sport_id: {
      type: Sequelize.STRING
    },
    radar_id: {
      type: Sequelize.STRING
    },
    home_id: {
      type: Sequelize.STRING
    },
    away_id: {
      type: Sequelize.STRING
    },
    spread_id: {
      type: Sequelize.STRING
    },
    totals_id: {
      type: Sequelize.STRING
    },
    sr_id: {
      type: Sequelize.STRING
    },
    scheduled: {
      type: Sequelize.INTEGER
    },
    scheduled_tw: {
      type: Sequelize.DATE
    },
    flag_prematch: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    status: {
      type: Sequelize.INTEGER
    },
    home_points: {
      type: Sequelize.INTEGER
    },
    away_points: {
      type: Sequelize.INTEGER
    },
    spread_result: {
      type: Sequelize.STRING
    },
    totals_result: {
      type: Sequelize.STRING
    },
    ori_league_id: {
      type: Sequelize.STRING
    },
    ori_sport_id: {
      type: Sequelize.STRING
    },
    home_player: {
      type: Sequelize.TEXT
    },
    away_player: {
      type: Sequelize.TEXT
    },
    home_team: {
      type: Sequelize.TEXT
    },
    away_team: {
      type: Sequelize.TEXT
    },
    home_injury: {
      type: Sequelize.TEXT
    },
    away_injury: {
      type: Sequelize.TEXT
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['bets_id']
      },
      {
        unique: true,
        fields: ['bets_id', 'league_id']
      },
      { fields: ['scheduled', 'flag_prematch', 'status'] },
      {
        fields: ['status', 'spread_id']
      },
      {
        fields: ['status', 'totals_id']
      },
      {
        fields: ['home_id']
      },
      {
        fields: ['away_id']
      }

      // {
      //   fields: ['home_id', 'away_id', 'league_id']
      // }
    ]
  }
);

const Season = sequelize.define(
  'match__season',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    radar_id: {
      type: Sequelize.STRING,
      defaultValue: null
    },
    league_id: {
      type: Sequelize.STRING(8)
    },
    league_name: {
      type: Sequelize.STRING
    },
    season: {
      type: Sequelize.INTEGER
    },
    start_date: {
      type: Sequelize.STRING,
      defaultValue: null
    },
    end_date: {
      type: Sequelize.STRING,
      defaultValue: null
    },
    status: {
      type: Sequelize.INTEGER
    },
    type: {
      type: Sequelize.STRING
    },
    current: {
      type: Sequelize.INTEGER
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['league_id', 'season', 'type']
      },
      {
        fields: ['league_id', 'current']
      }
    ]
  }
);

/*
 * 預測單的資訊，unique key 為 bets_id, uid
 */
const Prediction = sequelize.define(
  'user__prediction',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    bets_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    league_id: {
      type: Sequelize.STRING(8)
    },
    sell: {
      type: Sequelize.INTEGER
    },
    match_scheduled: {
      type: Sequelize.INTEGER
    },
    match_scheduled_tw: {
      // match_scheduled 欄位的 DATE format
      type: Sequelize.DATE
    },
    match_date: {
      type: Sequelize.INTEGER
    },
    spread_id: {
      type: Sequelize.STRING,
      defaultValue: null
    },
    spread_option: {
      type: Sequelize.STRING,
      defaultValue: null
    },
    spread_bets: {
      type: Sequelize.INTEGER,
      defaultValue: null
    },
    spread_result: {
      type: Sequelize.STRING,
      defaultValue: null
    },
    totals_id: {
      type: Sequelize.STRING,
      defaultValue: null
    },
    totals_option: {
      type: Sequelize.STRING,
      defaultValue: null
    },
    totals_bets: {
      type: Sequelize.INTEGER,
      defaultValue: null
    },
    totals_result: {
      type: Sequelize.STRING,
      defaultValue: null
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    user_status: {
      type: Sequelize.STRING
    },
    spread_result_flag: {
      type: Sequelize.FLOAT,
      defaultValue: -2
    },
    totals_result_flag: {
      type: Sequelize.FLOAT,
      defaultValue: -2
    }
  },
  {
    indexes: [
      {
        fields: ['uid', 'bets_id', 'spread_id']
      },
      {
        fields: ['uid', 'bets_id', 'totals_id']
      },
      {
        fields: ['uid', 'match_scheduled']
      },
      {
        unique: true,
        fields: ['uid', 'bets_id'] // 若無這組 key，使用者分別新增讓分或大小分會是兩張預測單
      },
      {
        fields: ['sell', 'league_id']
      },
      {
        fields: ['bets_id']
      },
      {
        fields: ['spread_id', 'totals_id'] // 為了刪除注單功能：清空 spread_id 和 totals_id 同時為空的無效注單
      },
      {
        fields: ['uid', 'league_id', 'match_date']
      }
    ]
  }
);

/*
 * 大神販售預測單的資訊，unique key 為 uid, day, league_id
 */
const PredictionDescription = sequelize.define(
  'user__prediction__description',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    rank_id: {
      type: Sequelize.STRING
    },
    league_id: {
      type: Sequelize.STRING(8)
    },
    day: {
      type: Sequelize.INTEGER
    },
    description: {
      type: Sequelize.TEXT
    },
    tips: {
      type: Sequelize.TEXT
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['uid', 'day', 'league_id']
      }
    ]
  }
);

/*
 * 各聯盟賽事結算資訊
 */
const Users_WinLists = sequelize.define(
  'users__win__lists',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING
    },
    league_id: {
      type: Sequelize.STRING
    },
    last_season_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_season_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_season_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    last_season_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    last_period_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_period_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_period_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    last_period_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    last_week1_of_period_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_week1_of_period_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_week1_of_period_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    last_week1_of_period_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    last_month_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_month_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_month_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    last_month_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    last_week_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_week_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    last_week_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    last_week_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_season_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_season_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_season_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_season_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_period_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_period_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_period_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_period_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_week1_of_period_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_week1_of_period_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_week1_of_period_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_week1_of_period_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_month_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_month_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_month_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_month_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_week_win_bets: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_week_win_rate: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    this_week_correct_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    this_week_fault_counts: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['uid', 'league_id']
      }
    ]
  }
);

/*
 * 各聯盟賽事結算資訊歷史記錄表
 */
const Users_WinListsHistory = sequelize.define(
  'users__win__lists__history',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING
    },
    league_id: {
      type: Sequelize.STRING
    },
    win_bets: {
      type: Sequelize.FLOAT
    },
    win_rate: {
      type: Sequelize.FLOAT
    },
    matches_count: {
      type: Sequelize.INTEGER
    },
    correct_counts: {
      type: Sequelize.INTEGER
    },
    fault_counts: {
      type: Sequelize.INTEGER
    },
    spread_correct_counts: {
      type: Sequelize.INTEGER
    },
    totals_correct_counts: {
      type: Sequelize.INTEGER
    },
    spread_fault_counts: {
      type: Sequelize.INTEGER
    },
    totals_fault_counts: {
      type: Sequelize.INTEGER
    },
    spread_win_rate: {
      type: Sequelize.FLOAT
    },
    totals_win_rate: {
      type: Sequelize.FLOAT
    },
    spread_correct_bets: {
      type: Sequelize.FLOAT
    },
    totals_correct_bets: {
      type: Sequelize.FLOAT
    },
    spread_fault_bets: {
      type: Sequelize.FLOAT
    },
    totals_fault_bets: {
      type: Sequelize.FLOAT
    },
    spread_win_bets: {
      type: Sequelize.FLOAT
    },
    totals_win_bets: {
      type: Sequelize.FLOAT
    },
    date_timestamp: {
      type: Sequelize.INTEGER
    },
    day_of_year: {
      type: Sequelize.INTEGER
    },
    period: {
      type: Sequelize.INTEGER
    },
    week_of_period: {
      type: Sequelize.INTEGER
    },
    week: {
      type: Sequelize.INTEGER
    },
    month: {
      type: Sequelize.INTEGER
    },
    season: {
      type: Sequelize.INTEGER
    }
  },
  {
    indexes: [
      {
        name: 'uldwms',
        fields: [
          'uid',
          'league_id',
          'date_timestamp',
          'date',
          'period',
          'week',
          'month',
          'season'
        ],
        unique: true
      }
      // { fields: ['uid', 'league_id', 'week'] },
      // { fields: ['uid', 'league_id', 'month'] },
      // { fields: ['uid', 'league_id', 'season'] }
    ]
  }
);

const UserFollow = sequelize.define(
  'user__follow',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    follow_uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    league_id: {
      type: Sequelize.STRING(8),
      allowNull: false
    }
  },
  {
    indexes: [
      {
        fields: ['uid']
      }
    ]
  }
);

/* 這邊給如果用 */

/*
 * 最愛大神
 */
const User_FavoriteGod = sequelize.define(
  'user__favoriteplayer',
  {
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    god_uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    league: {
      type: Sequelize.STRING,
      allowNull: false
    }
  },
  {
    indexes: [
      {
        fields: ['uid']
      }
    ]
  }
);

/*
 * 文章
 */
const Topic_Article = sequelize.define(
  'topic__article',
  {
    article_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    league: {
      // 球種/看板?
      type: Sequelize.STRING,
      allowNull: false
    },
    category: {
      // 文章分類
      type: Sequelize.INTEGER,
      allowNull: false
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    imgurl: {
      // 縮圖(只存第一張)
      type: Sequelize.STRING,
      allowNull: true
    },
    view_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    like_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    status: {
      // 預設1為正常 其他可能-1為刪除之類的 待討論
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    delete_reason: {
      type: Sequelize.TEXT
    },
    pin: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  },
  {
    indexes: [
      {
        fields: ['league']
      },
      {
        fields: ['uid']
      },
      {
        fields: ['article_id', 'category']
      },
      {
        fields: ['status', 'league', 'category']
      },
      {
        fields: ['status', 'category']
      }
    ]
  }
);

/*
 * 文章留言
 */
const Topic_Reply = sequelize.define(
  'topic__reply',
  {
    reply_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    article_id: {
      // 文章id
      type: Sequelize.INTEGER,
      allowNull: false
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    replyto_id: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    replyto_floor: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    images: {
      // 放圖片url用
      type: Sequelize.TEXT,
      allowNull: true
    },
    status: {
      // 預設1為正常 其他可能-1為刪除之類的 待討論
      type: Sequelize.INTEGER,
      defaultValue: 1
    },
    delete_reason: {
      type: Sequelize.TEXT
    }
  },
  {
    indexes: [
      {
        fields: ['article_id']
      }
    ]
  }
);

/*
 * 文章讚
 */
const Topic_Like = sequelize.define(
  'topic__like',
  {
    article_id: {
      // 文章id
      type: Sequelize.INTEGER,
      allowNull: false
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    }
  },
  {
    indexes: [
      {
        fields: ['article_id', 'uid']
      }
    ]
  }
);

/*
 * 留言讚
 */
const Topic_ReplyLike = sequelize.define(
  'topic__replylike',
  {
    reply_id: {
      // 文章id
      type: Sequelize.INTEGER,
      allowNull: false
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    }
  },
  {
    indexes: [
      {
        fields: ['reply_id', 'uid']
      }
    ]
  }
);

/*
 * 收藏文章
 */
const Topic_FavoriteArticle = sequelize.define(
  'topic__favoritearticle',
  {
    article_id: {
      // 文章id
      type: Sequelize.INTEGER,
      allowNull: false
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    }
  },
  {
    indexes: [
      {
        fields: ['article_id', 'uid']
      }
    ]
  }
);

/*
 * 打賞記錄
 */
const Topic_DonateArticle = sequelize.define(
  'topic__donate',
  {
    article_id: {
      // 文章id
      type: Sequelize.INTEGER,
      allowNull: false
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    cost: {
      type: Sequelize.INTEGER,
      allowNull: false
    }
  },
  {
    indexes: [
      {
        fields: ['article_id', 'uid']
      }
    ]
  }
);

/*
 * 檢舉文章
 */
const Service_ReportTopics = sequelize.define('service__reporttopic', {
  uid: {
    type: Sequelize.STRING,
    allowNull: true
  },
  type: {
    type: Sequelize.STRING,
    allowNull: false
  },
  article_id: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  content: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  status: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  reply: {
    type: Sequelize.STRING
  }
});

/*
 * 聯絡客服
 */
const Service_Contact = sequelize.define('service__contact', {
  uid: {
    type: Sequelize.STRING,
    allowNull: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false
  },
  content: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  images: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  status: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
});

/*
 * 首頁 排行榜預設值
 */
const Home_List = sequelize.define('home__list', {
  god_list: {
    type: Sequelize.STRING
  },
  win_rate_list: {
    type: Sequelize.STRING
  },
  win_bets_list: {
    type: Sequelize.STRING
  }
});

const Home_Banner = sequelize.define(
  'home__banner', // 不要再動了 拜託!!
  {
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    sort: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    imgurl: {
      type: Sequelize.STRING,
      allowNull: false
    },
    status: {
      type: Sequelize.INTEGER,
      defaultValue: 1 // 1為正常 -1可能為刪除 尚未實作
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    }
  },
  {
    indexes: [
      {
        fields: ['sort', 'status']
      }
    ]
  }
);

const UserBuy = sequelize.define(
  'user__buy',
  {
    buy_id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uid: {
      // 購買者 id
      type: Sequelize.STRING,
      allowNull: false
    },
    league_id: {
      // 聯盟 id
      type: Sequelize.STRING,
      allowNull: false
    },
    god_uid: {
      // 要購買的大神 uid
      type: Sequelize.STRING,
      allowNull: false
    },
    god_rank: {
      // 大神當期的階級
      type: Sequelize.INTEGER(4),
      allowNull: false
    },
    god_period: {
      // 大神當期的期數
      type: Sequelize.INTEGER,
      allowNull: false
    },
    day_of_year: {
      // 開賽時間/勝注勝率計算的日期（今年的第幾天）
      type: Sequelize.INTEGER,
      allowNull: false
    },
    season: {
      // 賽季年度
      type: Sequelize.INTEGER,
      allowNull: false
    },
    buy_status: {
      // 款項狀態：-1/0/1 （已退款/處理中/已付費）
      type: Sequelize.INTEGER(4),
      allowNull: false
    },
    matches_date: {
      // 賽事當天日期 unix time (+0)
      type: Sequelize.INTEGER,
      allowNull: false
    },
    matches_date_tw: {
      // matches_date 欄位的 DATE format
      type: Sequelize.DATE,
      allowNull: false
    },
    buy_date: {
      // 購買者購買當天日期的 unix time (+0)
      type: Sequelize.INTEGER,
      allowNull: false
    },
    buy_date_tw: {
      // buy_date 欄位的 DATE format
      type: Sequelize.DATE,
      allowNull: false
    }
  },
  {
    indexes: [
      // 可藉由此索引來搜尋購買者購買哪位大神、聯盟、和開打日期
      {
        fields: ['uid', 'league_id', 'god_uid', 'matches_date'],
        unique: true
      }
    ]
  }
);

const Honor_board = sequelize.define(
  'user__honor__board',
  {
    honor_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    uid: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    league_id: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: ''
    },
    rank_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: ''
    },
    scheduled: {
      type: Sequelize.INTEGER
    }
  },
  {
    indexes: [
      {
        fields: ['honor_id', 'uid', 'rank_id']
      }
    ]
  }
);

const News = sequelize.define(
  'user__new',
  {
    news_id: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING
    },
    sort: {
      type: Sequelize.INTEGER
    },
    sort_id: {
      type: Sequelize.INTEGER
    },
    league: {
      type: Sequelize.STRING
    },
    title: {
      type: Sequelize.STRING
    },
    content: {
      type: Sequelize.TEXT
    },
    status: {
      type: Sequelize.INTEGER
    },
    match_scheduled_tw: {
      type: Sequelize.DATE
    },
    active: {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    scheduled: {
      type: Sequelize.INTEGER
    }
  },
  {
    indexes: [
      {
        fields: ['news_id', 'uid', 'status', 'active', 'scheduled']
      }
    ]
  }
);

const News_Sys = sequelize.define(
  'user__news__sys',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    target: {
      type: Sequelize.TEXT
    },
    del: {
      type: Sequelize.TEXT
    },
    title: {
      type: Sequelize.STRING
    },
    content: {
      type: Sequelize.STRING
    },
    timestamp: {
      type: Sequelize.STRING
    }
  },
  {
    indexes: [
      {
        fields: ['news_id', 'uid', 'status', 'active', 'scheduled']
      }
    ]
  }
);

const News_System = sequelize.define(
  'user__news__system',
  {
    system_id: {
      type: Sequelize.INTEGER
    },
    uid: {
      type: Sequelize.STRING
    },
    active: {
      type: Sequelize.INTEGER
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['system_id']
      }
    ]
  }
);

const Bank = sequelize.define(
  'user__bank',
  {
    bank_id: {
      type: Sequelize.INTEGER
    },
    uid: {
      type: Sequelize.STRING
    },
    bank_code: {
      type: Sequelize.STRING
    },
    bank_username: {
      type: Sequelize.STRING
    },
    bank_account: {
      type: Sequelize.STRING
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['bank_id', 'uid']
      }
    ]
  }
);

/* 轉換紀錄狀態碼 */
const Transfer_Status = sequelize.define(
  'user__transfer__status',
  {
    status_code: {
      type: Sequelize.INTEGER
    },
    status_content: {
      type: Sequelize.STRING
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['status_code']
      }
    ]
  }
);

/* 紅利紀錄表 */
const Dividend = sequelize.define(
  'cashflow_dividend',
  {
    expire_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    uid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    expire_points: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    status: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    dividend_status: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    scheduled: {
      type: Sequelize.INTEGER
    },
    expire_scheduled: {
      type: Sequelize.INTEGER
    },
    createdAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    },
    updatedAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    }
  },
  {
    indexes: [
      {
        fields: ['expire_id', 'uid']
      }
    ]
  }
);

/* 現金紀錄表 */
const MoneyLogs = sequelize.define(
  'cashflow_money_logs',
  {
    money_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    uid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    money: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    money_real: {
      type: Sequelize.FLOAT,
      primaryKey: true
    },
    fee: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    fee_real: {
      type: Sequelize.FLOAT,
      primaryKey: true
    },
    money_active: {
      type: Sequelize.STRING
    },
    scheduled: {
      type: Sequelize.STRING
    },
    createdAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    },
    updatedAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    }
  },
  {
    indexes: [
      {
        fields: ['money_id', 'money', 'uid']
      }
    ]
  }
);

/* 金流-搞幣儲值 */
const CashflowDeposit = sequelize.define(
  'cashflow_deposit',
  {
    deposit_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    serial_number: {
      type: Sequelize.STRING
    },
    status: {
      type: Sequelize.STRING
    },
    order_status: {
      type: Sequelize.STRING
    },
    merchant_id: {
      type: Sequelize.STRING
    },
    payment_type: {
      type: Sequelize.STRING
    },
    payment_store: {
      type: Sequelize.STRING
    },
    trade_info: {
      type: Sequelize.STRING
    },
    trade_sha: {
      type: Sequelize.STRING
    },
    uid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    money: {
      type: Sequelize.INTEGER
    },
    money_real: {
      type: Sequelize.FLOAT
    },
    money_status: {
      type: Sequelize.INTEGER
    },
    coin: {
      type: Sequelize.INTEGER
    },
    coin_real: {
      type: Sequelize.FLOAT
    },
    coin_status: {
      type: Sequelize.INTEGER
    },
    dividend: {
      type: Sequelize.INTEGER
    },
    dividend_real: {
      type: Sequelize.FLOAT
    },
    dividend_status: {
      type: Sequelize.INTEGER
    },
    scheduled: {
      type: Sequelize.STRING
    },
    createdAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    },
    updatedAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    }
  },
  {
    indexes: [
      {
        fields: ['deposit_id', 'money', 'uid']
      }
    ]
  }
);

/* 金流-搞錠轉換 */
const IngotTransfer = sequelize.define(
  'cashflow_ingot_transfer',
  {
    transfer_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    from_transfer_id: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    status: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    cash_status: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    ingot: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    ingot_real: {
      type: Sequelize.FLOAT,
      primaryKey: true
    },
    coin: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    coin_real: {
      type: Sequelize.FLOAT,
      primaryKey: true
    },
    money: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    money_real: {
      type: Sequelize.FLOAT,
      primaryKey: true
    },
    fee: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    fee_real: {
      type: Sequelize.FLOAT,
      primaryKey: true
    },
    scheduled: {
      type: Sequelize.STRING
    },
    createdAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    },
    updatedAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    }
  },
  {
    indexes: [
      {
        fields: ['transfer_id', 'money', 'uid']
      }
    ]
  }
);

/* 金流-購牌 */
const CashflowBuy = sequelize.define(
  'cashflow_buy',
  {
    cbuy_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    buy_id: {
      type: Sequelize.INTEGER
    },
    uid: {
      type: Sequelize.STRING
    },
    god_uid: {
      type: Sequelize.STRING
    },
    league_id: {
      type: Sequelize.INTEGER
    },
    status: {
      type: Sequelize.INTEGER
    },
    dividend: {
      type: Sequelize.INTEGER
    },
    dividend_real: {
      type: Sequelize.FLOAT
    },
    coin: {
      type: Sequelize.INTEGER
    },
    coin_real: {
      type: Sequelize.FLOAT
    },
    matches_date: {
      type: Sequelize.INTEGER
    },
    scheduled: {
      type: Sequelize.STRING
    },
    createdAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    },
    updatedAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    }
  },
  {
    indexes: [
      // 可藉由此索引來搜尋購買者購買哪位大神、聯盟、和開打日期
      {
        fields: [
          'buy_id',
          'uid',
          'league_id',
          'god_uid',
          'status',
          'matches_date'
        ],
        unique: true
      }
    ]
  }
);

/* 金流-賣牌 */
const CashflowSell = sequelize.define(
  'cashflow_sell',
  {
    sell_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    buy_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    uid: {
      type: Sequelize.STRING
    },
    god_uid: {
      type: Sequelize.STRING
    },
    league_id: {
      type: Sequelize.STRING
    },
    status: {
      type: Sequelize.INTEGER
    },
    ingot: {
      type: Sequelize.INTEGER
    },
    ingot_real: {
      type: Sequelize.FLOAT
    },
    money: {
      type: Sequelize.INTEGER
    },
    money_real: {
      type: Sequelize.FLOAT
    },
    matches_date: {
      type: Sequelize.INTEGER
    },
    scheduled: {
      type: Sequelize.STRING
    },
    createdAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    },
    updatedAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    }
  },
  {
    indexes: [
      // 可藉由此索引來搜尋購買者購買哪位大神、聯盟、和開打日期
      {
        fields: [
          'buy_id',
          'uid',
          'god_uid',
          'league_id',
          'status',
          'matches_date'
        ],
        unique: true
      }
    ]
  }
);

/* 金流-打賞 */
const CashflowDonate = sequelize.define(
  'cashflow_donate',
  {
    donate_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    status: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    article_id: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    from_uid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    dividend: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    coin: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    ingot: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    ingot_real: {
      type: Sequelize.FLOAT,
      primaryKey: true
    },
    scheduled: {
      type: Sequelize.STRING
    },
    createdAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    },
    updatedAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    }
  },
  {
    indexes: [
      {
        fields: ['donate_id', 'status', 'uid']
      }
    ]
  }
);
const CashflowMission = sequelize.define(
  'cashflow_mission',
  {
    cashflow_mission_id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uid: {
      type: Sequelize.STRING
    },
    mission_item_id: {
      type: Sequelize.INTEGER
    },
    mission_god_id: {
      type: Sequelize.INTEGER
    },
    mission_deposit_id: {
      type: Sequelize.INTEGER
    },
    ingot: {
      type: Sequelize.INTEGER
    },
    coin: {
      type: Sequelize.INTEGER
    },
    dividend: {
      type: Sequelize.INTEGER
    },
    deposit_lottery: {
      type: Sequelize.INTEGER
    },
    scheduled: {
      type: Sequelize.STRING
    },
    createdAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    },
    updatedAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    }
  },
  {
    indexes: [
      {
        fields: ['cashflow_mission_id', 'uid']
      }
    ]
  }
);

const CashflowLogs = sequelize.define(
  'cashflow_transfer_logs',
  {
    title: {
      type: Sequelize.STRING
    },
    ingot: {
      type: Sequelize.INTEGER
    },
    ingot_real: {
      type: Sequelize.INTEGER
    },
    coin: {
      type: Sequelize.INTEGER
    },
    coin_real: {
      type: Sequelize.INTEGER
    },
    dividend: {
      type: Sequelize.INTEGER
    },
    dividend_real: {
      type: Sequelize.INTEGER
    },
    scheduled: {
      type: Sequelize.STRING
    }
  }
);
const PurchaseList = sequelize.define(
  'cashflow_purchase_list',
  {
    list_id: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    coin: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    dividend: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    official_active: {
      type: Sequelize.INTEGER
    },
    official_sort: {
      type: Sequelize.INTEGER
    },
    test_active: {
      type: Sequelize.INTEGER
    },
    test_sort: {
      type: Sequelize.INTEGER
    },
    createdAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    },
    updatedAt: {
      type: Sequelize.DATE(3),
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(3)')
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['list_id', 'coin', 'dividend']
      }
    ]
  }
);
const Token = sequelize.define(
  'token',
  {
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    token: {
      type: Sequelize.STRING,
      allowNull: false
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['name']
      }
    ]
  }
);

const AdminLogging = sequelize.define(
  'admin__logging',
  {
    uid: {
      type: Sequelize.STRING
    },
    name: {
      type: Sequelize.STRING
    },
    api_name: {
      type: Sequelize.STRING
    },
    description: {
      type: Sequelize.STRING
    },
    post_content: {
      type: Sequelize.TEXT
    },
    ip: {
      type: Sequelize.STRING
    },
    ua: {
      type: Sequelize.STRING
    }
  },
  {
    indexes: [
      {
        fields: ['uid', 'name']
      }
    ]
  }
);
const Player = sequelize.define(
  'player',
  {
    player_id: {
      type: Sequelize.STRING
    },
    league_id: {
      type: Sequelize.STRING
    },
    sport_id: {
      type: Sequelize.STRING
    },
    team_id: {
      type: Sequelize.STRING
    },
    ori_name: {
      type: Sequelize.STRING
    },
    name: {
      type: Sequelize.STRING
    },
    name_ch: {
      type: Sequelize.STRING
    },
    team_history: {
      type: Sequelize.TEXT
    },
    information: {
      type: Sequelize.TEXT
    }
  },
  {
    indexes: [
      {
        fields: ['team_id', 'name']
      }
    ]
  }
);

/*
  搞任務
*/
// 任務
const Mission = sequelize.define(
  'mission',
  {
    mission_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING
    },
    desc: {
      type: Sequelize.TEXT
    },
    type: {
      type: Sequelize.INTEGER
    },
    activity_type: {
      type: Sequelize.STRING
    },
    start_date: {
      type: Sequelize.INTEGER
    },
    end_date: {
      type: Sequelize.INTEGER
    },
    need_finish_nums: {
      type: Sequelize.INTEGER,
      defaultValue: 1
    },
    status: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  },
  {
    indexes: [
      {
        fields: ['type', 'status', 'start_date', 'end_date']
      }
    ]
  }
);

const MissionItem = sequelize.define(
  'mission_item',
  {
    mission_item_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mission_id: {
      type: Sequelize.INTEGER
    },
    func_type: {
      type: Sequelize.STRING
    },
    target: {
      type: Sequelize.STRING
    },
    reward_class: {
      type: Sequelize.INTEGER
    },
    reward_type: {
      type: Sequelize.STRING
    },
    reward_num: {
      type: Sequelize.INTEGER
    },
    reward_class_num: {
      type: Sequelize.INTEGER
    }
  }
);

const MissionGod = sequelize.define(
  'mission_god',
  {
    mission_god_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mission_id: {
      type: Sequelize.INTEGER
    },
    func_type: {
      type: Sequelize.STRING
    },
    target: {
      type: Sequelize.STRING
    },
    reward_type: {
      type: Sequelize.STRING
    },
    diamond_reward: {
      type: Sequelize.INTEGER
    },
    gold_reward: {
      type: Sequelize.INTEGER
    },
    sliver_reward: {
      type: Sequelize.INTEGER
    },
    copper_reward: {
      type: Sequelize.INTEGER
    }
  }
);

const MissionDeposit = sequelize.define(
  'mission_deposit',
  {
    mission_deposit_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mission_id: {
      type: Sequelize.INTEGER
    },
    deposit_list_id: {
      type: Sequelize.INTEGER
    },
    func_type: {
      type: Sequelize.STRING
    },
    target: {
      type: Sequelize.STRING
    },
    reward_type: {
      type: Sequelize.STRING
    },
    reward_num: {
      type: Sequelize.INTEGER
    }
  }
);

const UserMission = sequelize.define(
  'user__mission',
  {
    uid: {
      type: Sequelize.STRING
    },
    mission_item_id: {
      type: Sequelize.INTEGER
    },
    mission_god_id: {
      type: Sequelize.INTEGER
    },
    mission_deposit_id: {
      type: Sequelize.INTEGER
    },
    status: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    date_timestamp: {
      type: Sequelize.INTEGER
    }
  },
  {
    indexes: [
      {
        fields: ['uid', 'mission_item_id', 'mission_god_id', 'mission_deposit_id', 'date_timestamp']
      }
    ]
  }
);

const invoice_test = sequelize.define(
  'invoice_test',
  {
    content: {
      type: Sequelize.TEXT
    }
  },
  {
    indexes: [
      {
        fields: ['uid', 'content']
      }
    ]
  }
);

const godLimit = sequelize.define(
  'god_limit',
  {
    league_id: {
      type: Sequelize.STRING
    },
    period: {
      type: Sequelize.INTEGER
    },
    first_week_win_handicap: {
      type: Sequelize.FLOAT
    },
    this_period_win_handicap: {
      type: Sequelize.FLOAT
    }
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['league_id', 'period']
      }
    ]
  }
);

/*
* Relations
*/
// One-to-One
// User.hasOne(User_Blacklist, {
//   onDelete: 'SET NULL', // default
//   onUpdate: 'CASCADE', // default
//   foreignKey: 'uid'
// });
// User_Blacklist.belongsTo(User, { foreignKey: 'uid' });
// One-to-Many
// Many-to-Many

const dbUtil = {
  sequelize,
  Sequelize,
  Op,
  League,
  Spread,
  Totals,
  Match,
  Team,
  Prediction,
  PredictionDescription,
  User,
  User_Blacklist,
  User_BlockLog,
  Title,
  Collection,
  Rank,
  Users_WinLists,
  Users_WinListsHistory,
  User_FavoriteGod,
  Topic_Like,
  Topic_ReplyLike,
  Topic_Reply,
  Topic_Article,
  Topic_FavoriteArticle,
  Home_Banner,
  Home_List,
  Service_Contact,
  UserBuy,
  Honor_board,
  News,
  News_Sys,
  News_System,
  Bank,
  Transfer_Status,
  Season,
  UserFollow,
  Topic_DonateArticle,
  Service_ReportTopics,
  Dividend,
  MoneyLogs,
  CashflowDeposit,
  IngotTransfer,
  CashflowBuy,
  CashflowSell,
  CashflowDonate,
  CashflowMission,
  CashflowLogs,
  PurchaseList,
  Token,
  AdminLogging,
  Player,
  Mission,
  MissionItem,
  MissionGod,
  MissionDeposit,
  UserMission,
  invoice_test,
  godLimit
};

module.exports = dbUtil;
