class Card {
  static SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
  static RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

  static makeCard(rawCard) {
    return Object.assign(new Card(), rawCard);
  }

  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }

  getRank() {
    return this.rank;
  }

  getSuit() {
    return this.suit;
  }
}

module.exports = Card;