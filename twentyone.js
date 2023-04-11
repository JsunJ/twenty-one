const express = require("express");
const morgan = require("morgan");

const app = express();
const host = "localhost";
const port = 3001;

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));


// Redirect to game start page
app.get("/", (req, res) => {
  res.redirect("/game/start");
});

// Render start page
app.get("/game/start", (req, res) => {
  res.render("start");
});

// Start new game
app.post("/game/new", (req, res) => {
  
})

// Listener
app.listen(port, host, () => {
  console.log(`Twentyone is listening on port ${port} of ${host}!`);
});