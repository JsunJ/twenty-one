const Card = require("./card");
const shuffle = require('shuffle-array');

class Deck {
  static makeDeck(rawDeck) {
    let deck = Object.assign(new Deck(), {
      cards: [],
    });

    rawDeck.cards.forEach(card => deck.add(Card.makeCard(card)));
    return deck;
  }

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

  add(card) {
    if (!(card instanceof Card)) {
      throw new TypeError("can only add Card objects");
    }

    this.cards.push(card);
  }
}

module.exports = Deck;