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
    const FIND_HASHED_PASSWORD = "SELECT password FROM users" +
                                 "  WHERE username = $1";

    let result = await dbQuery(FIND_HASHED_PASSWORD, username);
    if (result.rowCount === 0) return false;

    return bcrypt.compare(password, result.rows[0].password);
  }


  async loadPurse(username) {
    const FIND_PURSE = "SELECT purse FROM users" +
                       "  WHERE username = $1";

    let result = await dbQuery(FIND_PURSE, this.username || username);
    return result.rows[0].purse;
  }

  async payout(amount) {
    const FIND_PURSE = "SELECT purse FROM users" +
                       "  WHERE username = $1";

    const SUBTRACT_FROM_PURSE = "UPDATE users" +
                                "  SET purse = $2" +
                                "    WHERE username = $1";

    let purseResult = await dbQuery(FIND_PURSE, this.username);
    console.log(purseResult);
    let purseAmount = purseResult.rows[0].purse;

    let newAmount = purseAmount - amount;
    let result = await dbQuery(SUBTRACT_FROM_PURSE, this.username, newAmount);
    return result.rowCount > 0;
  }

  async collect(amount) {
    const FIND_PURSE = "SELECT purse FROM users" +
                       "  WHERE username = $1";

    const ADD_TO_PURSE = "UPDATE users" +
                         "  SET purse = $2" +
                         "    WHERE username = $1";

    let purseResult = await dbQuery(FIND_PURSE, this.username);
    let purseAmount = purseResult.rows[0].purse;

    let newAmount = purseAmount + amount;
    let result = await dbQuery(ADD_TO_PURSE, this.username, newAmount);
    return result.rowCount > 0;
  }

  // Call the appropriate method for the collection or pay out of the bet,
  // based on the specified winner. Returns `true` if the collection or pay out
  // are successful, `false` otherwise.
  // async collectOrPayout(winner, amount) {
  //   let result = false;
  //   if (winner === "player") {
  //     result = await this.payout(amount);
  //   } else {
  //     result = await this.collect(amount);
  //   }

  //   return result;
  // }
};