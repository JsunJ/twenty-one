class Card {
  static SUITS = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
  static RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];

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