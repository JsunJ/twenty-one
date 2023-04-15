const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const store = require("connect-loki");
const SessionPersistence = require("./lib/session-persistence");

const app = express();
const host = "localhost";
const port = 3001;
const LokiStore = store(session);

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days in millseconds
    path: "/",
    secure: false,
  },
  name: "twenty-one-game-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "insecure-please-change-me-later",
  store: new LokiStore({}),
}));
app.use(flash());

// Create a new session datastore
app.use((req, res, next) => {
  res.locals.store = new SessionPersistence(req.session);
  next();
});

// Extract session info
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.get("/", (req, res) => {
  res.redirect("/game/start");
});

// Render game start page
app.get("/game/start", (req, res) => {
  res.render("start");
});

// Start new game
app.post("/game/new", (req, res, next) => {
  let initialized = res.locals.store.initializeGame();
  if (!initialized) {
    next(new Error("Failed to initialize game."));
  }

  res.redirect("/game/bet");
});

// Render the game bet page
app.get("/game/bet", (req, res) => {
  res.render("bet", {
    // pass in player's current purse (read from pg store)
  });
});

// Handle bet submission
app.post("/game/bet", (req, res, next) => {
  let betAmount = req.body.betAmount;
  let placed = res.locals.store.placeBet(+betAmount);
  if (!placed) {
    next(new Error("Failed to place bet."));
  }

  res.locals.store.setPlayerTurn();
  res.redirect("/game/player/turn");
});

// Render the player turn page
app.get("/game/player/turn", (req, res) => {
  let gameData = res.locals.store.loadGameData();

  if (res.locals.store.isBusted(gameData.player)) {
    res.redirect("/game/over");
  }

  res.render("player-turn", {
    dealer: gameData.dealer,
    player: gameData.player,
    bet: gameData.bet,
    handsEmpty: res.locals.store.handsEmpty(),
    cardHidden: res.locals.store.isCardHidden(),
    handValues: {
      dealer: res.locals.store.getHandValue(gameData.dealer),
      player: res.locals.store.getHandValue(gameData.player),
    }
  });
});

// Deal out player and dealer hands
app.post("/game/deal", (req, res, next) => {
  res.locals.store.dealHands(); // error?
  let hidden = res.locals.store.hideCard();
  if (!hidden) {
    next(new Error("Failed to hide card."));
  }

  res.redirect("/game/player/turn");
});

// Handle player hit
app.post("/game/player/hit", (req, res, next) => {
  let dealt = res.locals.store.dealPlayerCard();
  if (!dealt) {
    next(new Error("Failed to deal card."));
  }

  req.flash("gameplay", "Hit!");

  let player = res.locals.store.loadGameData().player;
  if (res.locals.store.isBusted(player)) {
    res.redirect("/game/over");
  }

  res.redirect("/game/player/turn");
});

// Handle player stand
app.post("/game/player/stand", (req, res, next) => {
  res.locals.store.setDealerTurn();
  let revealed = res.locals.store.revealCard();
  if (!revealed) {
    next(new Error("Failed to reveal card."));
  }

  req.flash("gameplay", "Stand!");
  req.flash("gameplay", "The dealer reveals their facedown card.");

  res.redirect("/game/dealer/turn");
});

// Render the dealer turn page
app.get("/game/dealer/turn", (req, res) => {
  let gameData = res.locals.store.loadGameData();

  if (res.locals.store.isBusted(gameData.dealer)) {
    res.redirect("/game/over");
  }

  res.render("dealer-turn", {
    dealer: gameData.dealer,
    player: gameData.player,
    bet: gameData.bet,
    cardHidden: res.locals.store.isCardHidden(),
    handValues: {
      dealer: res.locals.store.getHandValue(gameData.dealer),
      player: res.locals.store.getHandValue(gameData.player),
    },
  });
});

// Handle dealer hit
app.post("/game/dealer/hit", (req, res, next) => {
  let dealt = res.locals.store.dealDealerCard();
  if (!dealt) {
    next(new Error("Failed to deal card."));
  }

  req.flash("gameplay", "The dealer hits!");

  let dealer = res.locals.store.loadGameData().dealer;
  if (res.locals.store.isBusted(dealer)) {
    res.redirect("/game/over");
  }

  res.redirect("/game/dealer/turn");
});

// Render the game over page
app.get("/game/over", (req, res) => {
  let gameData = res.locals.store.loadGameData();

  if (res.locals.store.getHandValue(gameData.dealer) >= 17 &&
      !gameData.dealer.isBusted) {
    req.flash("gameplay", "The dealer stands!");
  }

  if (gameData.player.isBusted) req.flash("gameplay", "Hit!");

  res.render("over", {
    dealer: gameData.dealer,
    player: gameData.player,
    bet: gameData.bet,
    winner: res.locals.store.determineWinner(),
    cardHidden: res.locals.store.isCardHidden(),
    handValues: {
      dealer: res.locals.store.getHandValue(gameData.dealer),
      player: res.locals.store.getHandValue(gameData.player),
    },
    flash: req.flash(),
  });
});

// Handle payouts and collections
app.post("/game/over", (req, res) => {
  // collectOrPayout (pg store)
  // updatePurse (pg store)

  res.locals.store.destroyGame();

  res.redirect("/game/new");
});

// Render the play again page
app.get("/game/new", (req, res) => {

  res.render("new");
});

// Error handler
app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

// Listener
app.listen(port, host, () => {
  console.log(`Twentyone is listening on port ${port} of ${host}!`);
});