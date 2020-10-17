'use strict';

const express = require('express'); // express server library
const cors = require('cors'); // bad bodyguard that allows everyone in
const superagent = require('superagent');

// bring in the dotenv library
// the job of this library is to find the .env file and get the variables out of it so we can use them in our JS file
require('dotenv').config();

// this gives us a variable that we can use to run all the methods that are in the express library
const app = express();
app.use(cors());

// this lets us serve a website from a directory
// app.use(express.static('./public'));
// const { response } = require('express');

// the dotenv library lets us grab the PORT var from the .env using the magic words process.env.variableName
const PORT = process.env.PORT || 3001;


app.get('/location', locationHandler);

app.get('/weather', weatherHandler);

app.get('/trails', trailHandler);


function locationHandler(req, res) {
  let city = req.query.city;
  let key = process.env.GEOCODE_API_KEY;
  const url = `https://us1.locationiq.com/v1/search.php?key=${key}$q=${city}$format=json`;

  superagent.get(url)
    .then(results => {
      const location = new Location(city, results.body[0]);
      res.status(200).json(location);
    })
    .catch((error) => {
      console.log('ERROR', error);
      res.status(500).send('Our bad. Wheels aren\'t spinning!');
    })
}

function weatherHandler(request, response) {
  let url = `https://api.weatherbit.io/v2.0/current`;

  let queryParams = {
    key: process.env.WEATHER_API_KEY,
    lat: request.query.latitude,
    lon: request.query.longitude,
    days: 8
  }

  superagent.get(url)
    .query(queryParams)
    .then(results => {
      let weatherData = results.body;
      let obj = weatherData['data'].map(day => {
        return new Weather(day);
      })
      response.status(200).send(obj);
    })
    .catch((error) => {
      console.log('ERROR', error);
      response.status(500).send('It\'s not you, it\'s us!');
    })
}

function trailHandler(request, response) {
  let url = 'https://www.hikingproject.com/data/get-trails'

  let queryParams = {
    key: process.env.TRAIL_API_KEY,
    lat: request.query.latitude,
    lon: request.query.longitude,
    maxResults: 10
  }

  superagent.get(url)
    .query(queryParams)
    .then(results => {
      let trailData = results.body;
      let obj = trailData['trails'].map(trailObj => {
        return new Trails(trailObj);
      })
      response.status(200).send(obj);
    })
    .catch((error) => {
      console.log('ERROR', error);
      response.status(500).send('We done messed it up.');
    })
}

// Constructors
function Location(city, locationData) {
  this.search_query = city;
  this.formatted_query = locationData[0].display_name;
  this.latitude = locationData[0].lat;
  this.longitude = locationData[0].lon;
}

function Weather(obj) {
  this.time = new Date(obj.datetime).toDateString();
  this.forecast = obj.weather.description;
}

function Trails(obj) {
  this.name = obj.name;
  this.location = obj.location;
  this.length = obj.length;
  this.stars = obj.stars;
  this.star_votes = obj.starVotes;
  this.summary = obj.summary;
  this.trail_url = obj.url;
  this.conditions = obj.conditionDetails;
  this.condition_date = new Date(obj.conditionDate).toDateString();
  this.condition_time = new Date(obj.conditionDate).toTimeString();
}

// turn on the server

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
