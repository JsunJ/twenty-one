const express = require("express");
const morgan = require("morgan");
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

// Create a new session datastore
app.use((req, res, next) => {
  res.locals.store = new SessionPersistence(req.session);
  next();
});

app.get("/", (req, res) => {
  res.redirect("/game/start");
});

// Render game start page
app.get("/game/start", (req, res) => {
  res.locals.store.sessionLog();
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
  res.locals.store.sessionLog();
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

  res.locals.store.sessionLog();
  res.redirect("/game/player/turn");
});

// Render the player turn page
app.get("/game/player/turn", (req, res) => {
  // check if busted
  // CONTINUE to game over
  // or
  // HIT to /player/post
  // STAND to /player/stand

  res.render("player-turn");
});

// Handle player hit
app.post("/game/player/hit", (req, res) => {
  // deal a card

  res.redirect("/game/player/turn");
});

// Handle player stand
app.post("/game/player/stand", (req, res) => {
  // store player turn = false
  // store reveal the hidden card

  res.redirect("/game/dealer/turn");
});

// Render the dealer turn page
app.get("/game/dealer/turn", (req, res) => {
  // check if busted
  // CONTINUE to game over
  // or
  // check if < 17
  // CONTINUE to /dealer/hit
  // or
  // CONTINUE to /game/over

  res.render("dealer-turn");
});

// Handle dealer hit
app.post("/game/dealer/hit", (req, res) => {
  // deal a card

  res.redirect("/game/dealer/turn");
});

// Render the game over page
app.get("/game/over", (req, res) => {
  // read results
  // display result

  // PAY UP to /game/over POST
  // or
  // COLLECT to /game/over POST

  res.render("over");
});

// Handle payouts and collections
app.post("/game/over/post", (req, res) => {
  // collectOrPayout
  // updateScores
  // resetGameSession
  // game in progress = false

  res.redirect("/game/new");
});

// Render the play again page
app.get("/game/new", (req, res) => {
  // PLAY AGAIN to /game/new POST
  // or
  // QUIT to /game/start GET

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