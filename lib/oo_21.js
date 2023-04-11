const readline = require('readline-sync');
const shuffle = require('shuffle-array');

class Card {
  static SUITS = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
  static RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
  static SYMBOLS = ['♣', '♦', '♥', '♠'];

  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }

  toString() {
    return ` ${this.getRank()} of ${this.getSuit()}`;
  }

  getRank() {
    return this.rank;
  }

  getSuit() {
    return this.suit;
  }
}

class Deck {
  constructor() {
    this.cards = [];

    Card.SUITS.forEach(suit => {
      Card.RANKS.forEach(rank => {
        this.cards.push(new Card(suit, rank));
      });
    });

    this.shuffleCards();
  }

  shuffleCards() {
    shuffle(this.cards);
  }

  deal() {
    return this.cards.pop();
  }
}

class Player {
  static STARTING_PURSE = 5;
  static WINNING_PURSE = 10;
  static LOSING_PURSE = 0;

  constructor() {
    this.purse = Player.STARTING_PURSE;
    this.hand = [];
  }

  isRich() {
    return this.purse >= Player.WINNING_PURSE;
  }

  isBroke() {
    return this.purse <= Player.LOSING_PURSE;
  }
}

class Dealer {
  constructor() {
    this.hand = [];
  }
}

class TwentyOneGame {
  static BUST_LIMIT = 21;
  static DEALER_HIT_LIMIT = 17;
  static BET = 1;
  static HIT = 'h';
  static STAY = 's';

  constructor() {
    this.player = new Player();
    this.dealer = new Dealer();
  }

  start() {
    console.clear();
    this.displayWelcomeMessage();
    if (['q', 'quit'].includes(this.promptToStart())) return;

    while (true) {
      this.playSet();
      if (!this.playNewGame()) break;
    }

    this.displayGoodbyeMessage();
  }

  playSet() {
    while (true) {
      this.playRound();
      if (this.player.isBroke()) {
        console.log("\nYou're broke!");
        break;
      } else if (this.player.isRich()) {
        console.log("\nYou're rich!");
        break;
      }
      if (!this.playNewRound()) break;
    }
  }

  playRound() {
    console.clear();
    this.displayPurse();
    this.clearHands();
    this.newDeck(); // "Shuffle" the deck after every hand when playing single-deck.
    this.dealCards();
    this.displayHands();

    this.playerTurn();
    if (!this.isBusted(this.player)) {
      this.refreshRevealedHandDisplay();
      this.dealerTurn();
    }

    this.payoutOrCollect();
    this.refreshRevealedHandDisplay();
    this.displayResult();
  }

  newDeck() {
    this.deck = new Deck();
  }

  dealCards() {
    this.player.hand.push(this.deck.deal());
    this.dealer.hand.push(this.deck.deal());
    this.player.hand.push(this.deck.deal());
    this.dealer.hand.push(this.deck.deal());
  }

  hit(player) {
    player.hand.push(this.deck.deal());
  }

  clearHands() {
    this.player.hand = [];
    this.dealer.hand = [];
  }

  displayHands() {
    console.log('');
    console.log(' Total: ~');
    console.log(` Dealer's Hand: !HIDDEN CARD! |${this.dealer.hand.slice(1, this.dealer.hand.length)}`);
    console.log('');
    console.log(' - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -');
    console.log('');
    console.log(` Your Hand:${this.player.hand.join(' |')}`);
    this.displayHandValue(this.player);
  }

  displayRevealedHands() {
    console.log('');
    this.displayHandValue(this.dealer);
    console.log(` Dealer Hand:${this.dealer.hand.join(' |')}`);
    console.log('');
    console.log(' - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -');
    console.log('');
    console.log(` Your Hand:${this.player.hand.join(' |')}`);
    this.displayHandValue(this.player);
  }

  displayHandValue(player) {
    console.log(` Total: ${this.getHandValue(player)}`);
  }

  getHandValue(player) {
    let cardValues = player.hand.map(card => card.rank);

    let cardSum = 0;
    cardValues.forEach(value => {
      if (value === 'Ace') {
        cardSum += 11;
      } else if (['Jack', 'Queen', 'King'].includes(value)) {
        cardSum += 10;
      } else {
        cardSum += Number(value);
      }
    });

    cardValues.filter(value => value === 'A').forEach(_ => {
      if (cardSum > TwentyOneGame.BUST_LIMIT) cardSum -= 10;
    });

    return cardSum;
  }

  playerTurn() {
    while (this.hitOrStay() === TwentyOneGame.HIT) {
      this.hit(this.player);
      this.refreshHandDisplay();
      if (this.isBusted(this.player)) {
        console.log('You busted!');
        this.promptToContinue();
        break;
      }
    }
  }

  dealerTurn() {
    let hitCount = 0;

    while (true) {
      let handValue = this.getHandValue(this.dealer);

      if (handValue >= TwentyOneGame.DEALER_HIT_LIMIT) {
        console.log(`\nThe dealer stayed after ${hitCount} hit(s).`);
        this.promptToContinue();
        break;
      }

      this.hit(this.dealer);
      hitCount += 1;
      this.refreshRevealedHandDisplay();

      if (this.isBusted(this.dealer)) {
        console.log(`\nThe dealer busted after ${hitCount} hit(s)!`);
        this.promptToContinue();
        break;
      }
    }
  }

  isBusted(player) {
    return this.getHandValue(player) > TwentyOneGame.BUST_LIMIT;
  }

  hitOrStay() {
    this.prompt('Hit or Stay?');
    let answer = readline.question().toLowerCase();
    while (!['h', 'hit', 's', 'stay'].includes(answer)) {
      this.prompt("Invalid choice. Please enter 'h' or 'hit' to hit, or enter 's' or 'stay' to stay.");
      answer = readline.question().toLowerCase();
    }
    if (answer === 'hit' || answer === 'h') return TwentyOneGame.HIT;
    return answer;
  }

  displayWelcomeMessage() {
    console.log('Welcome to Twenty-One!');
    this.displayCardArt();
    console.log('You will be given a starting purse of $5 on the house.');
    console.log('Each hand is worth $1. Get rich ($10) to win or go broke ($0) and go home!');
  }

  displayCardArt() {
    console.log('');
    console.log("+-----+ +-----+");
    console.log(`|  A  | |  Q  |`);
    console.log("|     | |     |  =  21");
    console.log(`|  ${Card.SYMBOLS[2]}  | |  ${Card.SYMBOLS[3]}  |`);
    console.log("+-----+ +-----+");
    console.log('');
  }

  refreshHandDisplay() {
    console.clear();
    this.displayPurse();
    this.displayHands();
  }

  refreshRevealedHandDisplay() {
    console.clear();
    this.displayPurse();
    this.displayRevealedHands();
  }

  displayPurse() {
    console.log(`Current Purse: $${this.player.purse}`);
  }

  displayGoodbyeMessage() {
    console.log('\nThank you for playing Twenty-One! Goodbye!');
  }

  determineRoundWinner() {
    if (this.isBusted(this.player)) return this.dealer;
    if (this.isBusted(this.dealer)) return this.player;

    let playerTotal = this.getHandValue(this.player);
    let dealerTotal = this.getHandValue(this.dealer);

    if (playerTotal > dealerTotal) {
      return this.player;
    } else if (playerTotal < dealerTotal) {
      return this.dealer;
    } else {
      return 'tie';
    }
  }

  displayResult() {
    switch (this.determineRoundWinner()) {
      case this.player:
        console.log('\nYou win this hand!');
        break;
      case this.dealer:
        console.log('\nThe dealer wins this hand!');
        break;
      case 'tie':
        console.log("\nTie!");
    }
  }

  payoutOrCollect() {
    if (this.determineRoundWinner() === this.player) {
      this.player.purse += TwentyOneGame.BET;
    } else if (this.determineRoundWinner() === this.dealer) {
      this.player.purse -= TwentyOneGame.BET;
    }
  }

  prompt(msg) {
    console.log(`\n=> ${msg}`);
  }

  clearLastLine() {
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(1);
  }

  promptToStart() {
    this.prompt("Enter 'P' to play or 'Q' to quit.");
    let response = readline.question().toLowerCase();
    while (!['p', 'play', 'q', 'quit'].includes(response)) {
      this.prompt("Invalid response. Please enter 'P' or 'Play' to play, or enter 'Q' or 'Quit' to quit.");
      response = readline.question().toLowerCase();
    }
    return response;
  }

  promptToContinue() {
    this.prompt("Enter 'C' to continue...");
    let response = readline.question().toLowerCase();
    while (!['c', 'continue'].includes(response)) {
      this.prompt("Invalid response. Please enter 'C' or 'Continue' to continue...");
      response = readline.question().toLowerCase();
    }
  }

  playNewRound() {
    this.prompt('Would you like to play another hand? (Y/N)');
    let response = readline.question().toLowerCase();
    while (!['y', 'yes', 'n', 'no'].includes(response)) {
      this.prompt("Invalid Response. Please enter 'Yes' or 'Y' to continue playing, or enter 'No' or 'N' to exit.");
      response = readline.question().toLowerCase();
    }

    return ['y', 'yes'].includes(response);
  }

  playNewGame() {
    this.prompt("Would you like to start the game over? The house will reset your purse to $5.");
    let response = readline.question().toLowerCase();
    while (!['y', 'yes', 'n', 'no'].includes(response)) {
      this.prompt("Invalid Response. Please enter 'Yes' or 'Y' to play again, or enter 'No' or 'N' to exit.");
      response = readline.question().toLowerCase();
    }

    if (response === 'y' || response === 'yes') {
      this.player.purse = Player.STARTING_PURSE;
    }

    return ['y', 'yes'].includes(response);
  }
}

let game = new TwentyOneGame();
game.start();