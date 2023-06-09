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
    this._gameData.player = { id: 1, hand: [] };
    this._gameData.dealer = { id: 0, hand: [] };

    return true;
  }

  // Clear all game data. Returns `true` on success, `false` on failure.
  destroyGame() {
    delete this._gameData.deck;
    delete this._gameData.player;
    delete this._gameData.dealer;
    delete this._gameData.bet;
    delete this._gameData.turn;
    delete this._gameData.cardHidden;

    return true;
  }

  // Place the player's bet into the session store. Returns `true` on success,
  // `false` on failure. The bet amount should be numeric.
  placeBet(bet) {
    this._gameData.bet = bet;

    return true;
  }

  // Return a copy of the game data.
  loadGameData() {
    return deepCopy(this._gameData);
  }

  // Deal starting hands to both the dealer and player.
  dealHands() {
    this._gameData.player.hand.push(this._gameData.deck.deal());
    this._gameData.dealer.hand.push(this._gameData.deck.deal());
    this._gameData.player.hand.push(this._gameData.deck.deal());
    this._gameData.dealer.hand.push(this._gameData.deck.deal());
  }

  // Returns `true` if the dealer and player have empty hands, `false`
  // otherwise. (new game condition)
  handsEmpty() {
    return this._gameData.dealer.hand.length === 0 &&
           this._gameData.player.hand.length === 0;
  }

  // Return `true` if the player has a "blackjack" win, false otherwise.
  hasBlackJack() {
    let playerValue = this.getHandValue(this._gameData.player);
    let dealerValue = this.getHandValue(this._gameData.dealer);

    return playerValue === 21 && dealerValue !== 21;
  }

  // Declare a blackjack win in the game data.
  setBlackJack() {
    this._gameData.player.hasBlackJack = true;
  }

  // Returns the value of the specified player's current hand.
  // Cards 2 through 10 have their face value.
  // Jacks, queens, and kings have a value of 10.
  // Aces have a value of 11 unless total hand sum is over 21, in which case
  // they have a value of 1.
  getHandValue(player) {
    let cardValues = player.hand.map(card => card.rank);

    let cardSum = 0;
    cardValues.forEach(value => {
      if (value === 'ace') {
        cardSum += 11;
      } else if (['jack', 'queen', 'king'].includes(value)) {
        cardSum += 10;
      } else {
        cardSum += Number(value);
      }
    });

    cardValues.filter(value => value === 'ace').forEach(_ => {
      if (cardSum > 21) cardSum -= 10;
    });

    return cardSum;
  }

  // "Hide" the dealer's second card by temporarily shifting it's position
  // in the game's data. Returns `true` on success, `false` on failure.
  hideCard() {
    this._gameData.dealer.hiddenCard = this._gameData.dealer.hand.pop();

    if (this._gameData.dealer.hiddenCard &&
        this._gameData.dealer.hand.length === 1) {
      this._gameData.cardHidden = true;
      return true;
    }

    return false;
  }

  // Returns `true` if there is a currently hidden card in the game, `false`
  // otherwise.
  isCardHidden() {
    if (this._gameData.cardHidden) return true;
    return false;
  }

  // "Unhide" the dealer's second card by shifting it back to their deck.
  // Returns `true` on success, `false` on failure.
  revealCard() {
    this._gameData.dealer.hand.push(this._gameData.dealer.hiddenCard);
    delete this._gameData.dealer.hiddenCard;

    if (!this._gameData.dealer.hiddenCard &&
        this._gameData.dealer.hand.length === 2) {
      delete this._gameData.cardHidden;
      return true;
    }

    return false;
  }

  // Returns `true` if the specified player has busted, `false` otherwise.
  isBusted(player) {
    return this.getHandValue(player) > 21;
  }

  // Flags the specified player as busted.
  bustPlayer(player) {
    if (player.id === this._gameData.player.id) {
      this._gameData.player.isBusted = true;
    } else {
      this._gameData.dealer.isBusted = true;
    }
  }

  // Deal a card to the player. Returns `true` on success, `false`
  // on failure.
  dealPlayerCard() {
    let cardCount = this._gameData.player.hand.length;

    this._gameData.player.hand.push(this._gameData.deck.deal());

    return this._gameData.player.hand.length === cardCount + 1;
  }

  // Deal a card to the dealer. Returns `true` on success, `false`
  // on failure.
  dealDealerCard() {
    let cardCount = this._gameData.dealer.hand.length;

    this._gameData.dealer.hand.push(this._gameData.deck.deal());

    return this._gameData.dealer.hand.length === cardCount + 1;
  }

  // Set the current game's turn to bet. Used in reloading an in-progress
  // session.
  setBetTurn() {
    this._gameData.turn = "bet";
  }

  // Set the current game's turn to the player. Used in reloading an in-progress
  // session.
  setPlayerTurn() {
    this._gameData.turn = "player";
  }

  // Set the current game's turn to the dealer. Used in reloading an in-progress
  // session.
  setDealerTurn() {
    this._gameData.turn = "dealer";
  }

  // Set the current game's turn to over. Used in reloading an in-progress
  // session.
  setGameOverTurn() {
    this._gameData.turn = "over";
  }

  // Determine and return the winner of the game.
  determineWinner() {
    if (this._gameData.player.isBusted) return 'dealer';
    if (this._gameData.dealer.isBusted) return 'player';

    let playerTotal = this.getHandValue(this._gameData.player);
    let dealerTotal = this.getHandValue(this._gameData.dealer);

    if (playerTotal > dealerTotal) {
      return 'player';
    } else if (playerTotal < dealerTotal) {
      return 'dealer';
    } else {
      return 'push';
    }
  }
};