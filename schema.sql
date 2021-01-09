-- Checks to see if location exists and if it does, drop it
DROP TABLE if exists locations;

-- Recreate what we need
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  latitude FLOAT8,
  longitude FLOAT8,
  search_query VARCHAR(2550),
  formatted_query VARCHAR(255)
);