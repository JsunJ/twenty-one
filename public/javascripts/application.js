"use strict";

// Game in progress sign in warning
document.addEventListener("DOMContentLoaded", function () {
  let form = document.querySelector("form.sign_in_warning");
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (confirm("Your current game will be lost.\nDo you want to continue?")) {
      event.target.submit();
    }
  });
});

// Game in progress sign out warning
document.addEventListener("DOMContentLoaded", function () {
  let form = document.querySelector("form.sign_out_warning");
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (confirm("Your current game will be lost.\nDo you want to continue?")) {
      event.target.submit();
    }
  });
});