const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const store = require("connect-loki");
const SessionPersistence = require("./lib/session-persistence");
const PgPersistence = require("./lib/pg-persistence");
const catchError = require("./lib/catch-error");

const app = express();
const host = "192.168.86.131";
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
  res.locals.sessionStore = new SessionPersistence(req.session);
  next();
});

// Create a new pg datastore
app.use((req, res, next) => {
  res.locals.pgStore = new PgPersistence(req.session);
  next();
});

// Extract session info
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.signedIn = req.session.signedIn;
  res.locals.purse = req.session.purse;
  res.locals.inProgress = req.session.inProgress;
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
  let initialized = res.locals.sessionStore.initializeGame();
  if (!initialized) {
    next(new Error("Failed to initialize game."));
  }
  req.session.inProgress = true;

  res.redirect("/game/bet");
});

// Render the game bet page
app.get("/game/bet", (req, res) => {
  // requiresInProgress
  // if bet already placed, flash a message and
  // CONTINUE to the current turn
  res.render("bet");
});

// Handle bet submission
app.post("/game/bet", (req, res, next) => {
  // requiresInProgress
  // if bet already placed, do nothing?
  let betAmount = req.body.betAmount;
  let placed = res.locals.sessionStore.placeBet(+betAmount);
  if (!placed) {
    next(new Error("Failed to place bet."));
  }

  req.flash("gameplay", "Bet placed!");
  res.locals.sessionStore.setPlayerTurn();
  res.redirect("/game/player/turn");
});

// Render the player turn page
app.get("/game/player/turn", (req, res) => {
  // requiresInProgress
  let gameData = res.locals.sessionStore.loadGameData();

  if (res.locals.sessionStore.isBusted(gameData.player)) {
    res.redirect("/game/over");
  }

  res.render("player-turn", {
    dealer: gameData.dealer,
    player: gameData.player,
    bet: gameData.bet,
    handsEmpty: res.locals.sessionStore.handsEmpty(),
    cardHidden: res.locals.sessionStore.isCardHidden(),
    handValues: {
      dealer: res.locals.sessionStore.getHandValue(gameData.dealer),
      player: res.locals.sessionStore.getHandValue(gameData.player),
    }
  });
});

// Deal out player and dealer hands
app.post("/game/deal", (req, res, next) => {
  // requiresInProgress
  res.locals.sessionStore.dealHands(); // error?
  let hidden = res.locals.sessionStore.hideCard();
  if (!hidden) {
    next(new Error("Failed to hide card."));
  }

  if (res.locals.sessionStore.hasBlackJack()) {
    res.locals.sessionStore.setBlackJack();
    let revealed = res.locals.sessionStore.revealCard();
    if (!revealed) {
      next(new Error("Failed to reveal card."));
    }

    res.redirect("/game/over");
  }

  res.redirect("/game/player/turn");
});

// Handle player hit
app.post("/game/player/hit", (req, res, next) => {
  // requiresInProgress
  let dealt = res.locals.sessionStore.dealPlayerCard();
  if (!dealt) {
    next(new Error("Failed to deal card."));
  }

  req.flash("gameplay", "Hit!");

  let player = res.locals.sessionStore.loadGameData().player;
  if (res.locals.sessionStore.isBusted(player)) {
    res.locals.sessionStore.bustPlayer(player);
    let revealed = res.locals.sessionStore.revealCard();
    if (!revealed) {
      next(new Error("Failed to reveal card."));
    }
    res.redirect("/game/over");
  } else {
    res.redirect("/game/player/turn");
  }
});

// Handle player stand
app.post("/game/player/stand", (req, res, next) => {
  // requiresInProgress
  res.locals.sessionStore.setDealerTurn();
  let revealed = res.locals.sessionStore.revealCard();
  if (!revealed) {
    next(new Error("Failed to reveal card."));
  }

  req.flash("gameplay", "Stand!");
  req.flash("gameplay", "The dealer revealed their facedown card!");

  res.redirect("/game/dealer/turn");
});

// Render the dealer turn page
app.get("/game/dealer/turn", (req, res) => {
  // requiresInProgress
  let gameData = res.locals.sessionStore.loadGameData();

  // if (res.locals.sessionStore.isBusted(gameData.dealer)) {
  //   res.redirect("/game/over");
  // }

  res.render("dealer-turn", {
    dealer: gameData.dealer,
    player: gameData.player,
    bet: gameData.bet,
    cardHidden: res.locals.sessionStore.isCardHidden(),
    handValues: {
      dealer: res.locals.sessionStore.getHandValue(gameData.dealer),
      player: res.locals.sessionStore.getHandValue(gameData.player),
    },
  });
});

// Handle dealer hit
app.post("/game/dealer/hit", (req, res, next) => {
  // requiresInProgress
  let dealt = res.locals.sessionStore.dealDealerCard();
  if (!dealt) {
    next(new Error("Failed to deal card."));
  }

  req.flash("gameplay", "The dealer hits!");

  let dealer = res.locals.sessionStore.loadGameData().dealer;
  if (res.locals.sessionStore.isBusted(dealer)) {
    res.locals.sessionStore.bustPlayer(dealer);
    res.redirect("/game/over");
  } else {
    res.redirect("/game/dealer/turn");
  }
});

// Render the game over page
app.get("/game/over", (req, res) => {
  // requiresInProgress
  let gameData = res.locals.sessionStore.loadGameData();

  if (res.locals.sessionStore.getHandValue(gameData.dealer) >= 17 &&
      !gameData.dealer.isBusted && !gameData.player.isBusted) {
    res.locals.flash.gameplay = [ "The dealer stands!" ];
  }

  res.render("over", {
    dealer: gameData.dealer,
    player: gameData.player,
    bet: gameData.bet,
    winner: res.locals.sessionStore.determineWinner(),
    cardHidden: res.locals.sessionStore.isCardHidden(),
    handValues: {
      dealer: res.locals.sessionStore.getHandValue(gameData.dealer),
      player: res.locals.sessionStore.getHandValue(gameData.player),
    },
    hasBlackJack: gameData.player.hasBlackJack,
  });
});

// Handle payouts and collections
app.post("/game/over",
  catchError(async (req, res) => {
    // requiresInProgress

    // make all this better
    if (res.locals.signedIn) {
      let winner = res.locals.sessionStore.determineWinner();
      let bet = res.locals.sessionStore.loadGameData().bet;
      let player = res.locals.sessionStore.loadGameData().player;

      // purse updates
      if (player.hasBlackJack) {
        bet *= 1.5;
        await res.locals.pgStore.collect(bet);
        req.flash("gameplay", `You've won ${bet} dollars!`);
      } else if (winner === "player") {
        await res.locals.pgStore.collect(bet);
        req.flash("gameplay", `You've won ${bet} dollars!`);
      } else if (winner === "dealer") {
        await res.locals.pgStore.payout(bet);
        req.flash("gameplay", `You've lost ${bet} dollars!`);
      } else {
        req.flash("gameplay", `Your bet has been returned.`);
      }

      req.session.purse = await res.locals.pgStore.loadPurse();

      // win/loss updates
      await res.locals.pgStore.tallyWinLoss(winner);
    }

    delete req.session.inProgress;
    res.locals.sessionStore.destroyGame();
    res.redirect("/game/new");
  })
);

// Render the play again page
app.get("/game/new", (req, res) => {
  // requiresInProgress

  res.render("new");
});

// Render the sign in page
app.get("/users/signin", (req, res) => {
  req.flash("info", "Please enter your username and password.");
  res.render("signin", {
    flash: req.flash(),
  });
});

// Handle sign in form submission
app.post("/users/signin",
  catchError(async (req, res) => {
    let user = req.body.username.trim();
    let pass = req.body.password;

    let authenticated = await res.locals.pgStore.authenticate(user, pass);
    if (!authenticated) {
      req.flash("error", "Invalid credentials.");
      res.render("signin", {
        flash: req.flash(),
        username: req.body.username,
      });
    } else {
      req.session.username = user;
      req.session.signedIn = true;
      req.session.purse = await res.locals.pgStore.loadPurse(user);
      delete req.session.inProgress;
      res.locals.sessionStore.destroyGame();
      req.flash("info", "Sign in successful!");
      res.redirect("/game/start");
    }
  })
);

// Handle sign out
app.post("/users/signout", (req, res) => {
  delete req.session.username;
  delete req.session.signedIn;
  delete req.session.purse;
  delete req.session.inProgress;
  res.locals.sessionStore.destroyGame();
  req.flash("info", "Sign out successful!");
  res.redirect("/game/start");
});

// Render the leaderboard page
app.get("/game/leaderboard",
  catchError(async (req, res) => {
    let stats = await res.locals.pgStore.leaderboard();

    res.render("leaderboard", { stats });
  })
);

// Error handler
app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

// Listener
app.listen(port, host, () => {
  console.log(`Twentyone is listening on port ${port} of ${host}!`);
});