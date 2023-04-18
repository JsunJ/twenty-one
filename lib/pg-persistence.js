const { dbQuery } = require("./db-query");
const bcrypt = require("bcrypt");

module.exports = class PgPersistence {
  constructor(session) {
    this.username = session.username;
  }

  // Returns a Promise that resolves to `true` if `username` and `password`
  // combine to identify a legitimate application user, `false` if either the
  // `username` or `password` is invalid.
  async authenticate(username, password) {
    const FIND_HASHED_PASSWORD = "SELECT password FROM twenty_one_users" +
                                 "  WHERE username = $1";

    let result = await dbQuery(FIND_HASHED_PASSWORD, username);
    if (result.rowCount === 0) return false;

    return bcrypt.compare(password, result.rows[0].password);
  }

  //
  async loadPurse(username) {
    const FIND_PURSE = "SELECT purse FROM twenty_one_users" +
                       "  WHERE username = $1";

    let result = await dbQuery(FIND_PURSE, this.username || username);
    return result.rows[0].purse;
  }

  //
  async payout(amount) {
    const SUBTRACT_FROM_PURSE = "UPDATE twenty_one_users" +
                                "  SET purse = purse - $2" +
                                "    WHERE username = $1";

    let result = await dbQuery(SUBTRACT_FROM_PURSE, this.username, amount);
    return result.rowCount > 0;
  }

  //
  async collect(amount) {
    const ADD_TO_PURSE = "UPDATE twenty_one_users" +
                         "  SET purse = purse + $2" +
                         "    WHERE username = $1";

    let result = await dbQuery(ADD_TO_PURSE, this.username, amount);
    return result.rowCount > 0;
  }

  //
  async tallyWinLoss(winner) {
    const INCREMENT_WIN = "UPDATE twenty_one_users" +
                          "  SET wins = wins + 1" +
                          "    WHERE username = $1";

    const INCREMENT_LOSS = "UPDATE twenty_one_users" +
                           "  SET losses = losses + 1" +
                           "    WHERE username = $1";

    let winResult;
    let lossResult;
    if (winner === "player") {
      winResult = await dbQuery(INCREMENT_WIN, this.username);
      return winResult.rowCount > 0;
    } else {
      lossResult = await dbQuery(INCREMENT_LOSS, this.username);
      return lossResult.rowCount > 0;
    }
  }

  // Returns a promise that resolves to a sorted list of all existing user
  // stats. The list is sorted by purse amount.
  async leaderboard() {
    const ALL_USERS = "SELECT username, purse, wins, losses" +
                      "  FROM twenty_one_users" +
                      "    ORDER BY purse DESC, wins DESC, username";

    let result = await dbQuery(ALL_USERS);
    return result.rows;
  }
};