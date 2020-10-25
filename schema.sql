-- DROP TABLE IF EXISTS people;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  city VARCHAR(255),
  formatted_city VARCHAR(255),
  latitude VARCHAR(255),
  longitude VARCHAR(255)
);