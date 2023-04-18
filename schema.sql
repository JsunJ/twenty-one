CREATE TABLE twenty_one_users (
  id serial PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  purse integer DEFAULT 1000,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0
);