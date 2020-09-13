const db = require('./mysqlUtil');

async function connection() {
  try {
    await db.sequelize.authenticate();
    console.log(`Connection has been established successfully at ${new Date()}`);
  } catch (err) {
    console.log(err);
  }
}
module.exports = connection;
