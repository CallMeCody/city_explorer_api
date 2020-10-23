'use strict';


const express = require('express'); // express server library
const cors = require('cors'); // bad bodyguard that allows everyone in
const superagent = require('superagent');
const pg = require('pg');
const { json } = require('express');

// bring in the dotenv library
// the job of this library is to find the .env file and get the variables out of it so we can use them in our JS file
require('dotenv').config();

// this gives us a variable that we can use to run all the methods that are in the express library
const app = express();
app.use(cors());

const client = new pg.Client(process.env.WINDOWS_DATABASE_URL);
client.on('error', err => {
  console.log('ERROR', err);
});
// this lets us serve a website from a directory
// app.use(express.static('./public'));
// const { response } = require('express');

// the dotenv library lets us grab the PORT var from the .env using the magic words process.env.variableName
const PORT = process.env.PORT || 3001;


app.get('/location', lookupDatabase);

app.get('/weather', weatherHandler);

app.get('/trails', trailHandler);

function lookupDatabase(request, response) {
  let city = request.query.city;
  let sql = 'SELECT * FROM locations;';
  // `SELECT * FROM locations WHERE city=${request.query.city};`
  client.query(sql)
    .then(resultsFromPostgres => {
      let storedLocation = resultsFromPostgres.rows;
      let previousLocations = [];
      storedLocation.forEach(obj => {
        if (obj.city === city) {
          previousLocations.push(obj);
        }
      })
      if (previousLocations.length === 0) {
        locationHandler(request, response);
      }
      else {
        response.status(200).send(previousLocations[0]);
        console.log('returned from storage: ', previousLocations[0]);
      }
    }).catch(err => console.log(err));
}

function locationHandler(request, response) {
  let city = request.query.city;
  let url = `https://us1.locationiq.com/v1/search.php`;

  let queryParams = {
    key: process.env.GEOCODE_API_KEY,
    q: city,
    format: 'json',
    limit: 1
  }

  superagent.get(url)
    .query(queryParams)
    .then(results => {
      let geoData = results.body;
      const obj = new Location(city, geoData);
      response.status(200).send(obj);

      let sql = 'INSERT INTO locations (city, formatted_city, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id;';
      let safeValues = [obj.search_query, obj.formatted_query, obj.latitude, obj.longitude];

      client.query(sql, safeValues)
        .then(resultsFromPostgres => {
          let id = resultsFromPostgres.rows;
          console.log('id is', id);
        });
    })

    .catch((error) => {
      console.log('ERROR', error);
      response.status(500).send('Our bad. Wheels aren\'t spinning!');
    })

}

function weatherHandler(request, response) {
  let url = `http://api.weatherbit.io/v2.0/forecast/daily`;

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

// function addToDatabase(request, response){
//   let lat = request.query.latitude;
//   let lon = request.query.latitude;

//   let sql = 'INSERT INTO locations (latitude, longitude) VALUES ($1, $2) RETURNING id;';
//   let safeValues = [lat, lon];

//   client.query(sql, safeValues)
//     .then(resultsFromPostgres => {
//       let id = resultsFromPostgres.rows;
//       console.log('id is',id);
//     });
// }

//======================================== Constructors============================================
function Location(location, obj) {
  this.search_query = location;
  this.formatted_query = obj[0].display_name;
  this.latitude = obj[0].lat;
  this.longitude = obj[0].lon;
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

//====================================== turn on the server========================================
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`listening on ${PORT}`)
    })
  }).catch(err => console.log('ERROR', err));
