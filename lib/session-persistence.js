const deepCopy = require("./deep-copy");
const Deck = require("./deck");

module.exports = class SessionPersistence {
  constructor(session) {
    if (session.gameData) {
      // Rebuild the deck and card prototype information from raw data in the
      // session store, if it exists.
      if ("deck" in session.gameData) {
        let rawDeck = session.gameData.deck;
        session.gameData.deck = Deck.makeDeck(rawDeck);
      }

      // Create a reference to the session store game data for use in this
      // module.
      this._gameData = session.gameData;
    } else {
      // Initialize both the session store game data and a reference to it for
      // use in this module.
      this._gameData = {};
      session.gameData = this._gameData;
    }
  }

  // Initialize the components for a new game. Returns `true` on success,
  // `false` on failure.
  initializeGame() {
    this._gameData.deck = new Deck();
    this._gameData.player = { hand: [] };
    this._gameData.dealer = { hand: [] };
    this._gameData.inProgress = true;

    return true;
  }

  // Clear all game data. Returns `true` on success, `false` on failure.
  destroyGame() {
    delete this._gameData.deck;
    delete this._gameData.player;
    delete this._gameData.dealer;
    delete this._gameData.inProgress;
    delete this._gameData.bet;

    return true;
  }

  // Place the player's bet into the session store. Returns `true` on success,
  // `false` on failure. The bet amount should be numeric.
  placeBet(bet) {
    this._gameData.bet = bet;

    return true;
  }

  // TESTING. log various things in the session store when called
  sessionLog() {
    console.log(this._gameData);
  }
};