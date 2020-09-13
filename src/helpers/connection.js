const db = require('./mysqlUtil');
const { taipeiDate } = require('../helpers/momentUtil');

async function connection() {
  try {
    await db.sequelize.authenticate();
    console.log(`Connection has been established successfully at ${taipeiDate(new Date())}`);
  } catch (err) {
    console.log(err);
  }
}
module.exports = connection;
