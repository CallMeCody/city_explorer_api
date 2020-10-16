'use strict';

// this will bring in my express library
const express = require('express');

// bring in the dotenv library
// the job of this library is to find the .env file and get the variables out of it so we can use them in our JS file
require('dotenv').config();

// this gives us a variable that we can use to run all the methods that are in the express library
const app = express();

// this lets us serve a website from a directory
app.use(express.static('./public'));

const cors = require('cors');
app.use(cors());

// the dotenv library lets us grab the PORT var from the .env using the magic words process.env.variableName
const PORT = process.env.PORT || 3000;

app.get('/location',(request, response) => {
  let city = request.query.city;
  let geoData = require('./data/location.json');

  const obj = new Location(city, geoData);
  console.log('from appget', city, geoData);
  response.send(obj);
})

function Location(location, obj){
  this.search_query = location;
  this.formatted_query = obj[0].display_name;
  this.latitude = obj[0].lat;
  this.longitude = obj[0].lon;
}

// turn on the server

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
