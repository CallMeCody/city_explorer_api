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

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => {
  console.log('ERROR', err);
});
// this lets us serve a website from a directory
// app.use(express.static('./public'));
// const { response } = require('express');

// the dotenv library lets us grab the PORT var from the .env using the magic words process.env.variableName
const PORT = process.env.PORT || 3001;


app.get('/location', locationHandler);

app.get('/weather', weatherHandler);

app.get('/trails', trailHandler);

app.get('/movies', movieHandler);

app.get('/yelp', yelpHandler);


function yelpHandler(request, response) {
  // "name": "Umi Sake House",
  //   "image_url": "https://s3-media3.fl.yelpcdn.com/bphoto/c-XwgpadB530bjPUAL7oFw/o.jpg",
  //   "price": "$$   ",
  //   "rating": "4.0",
  //   "url": "https://www.yelp.com/biz/umi-sake-house-seattle?adjust_creative=uK0rfzqjBmWNj6-d3ujNVA&utm_campaign=yelp_api_v3&utm_medium=api_v3_business_search&utm_source=uK0rfzqjBmWNj6-d3ujNVA"
  let url = `https://api.yelp.com/v3/businesses/search`;
  const numPerPage = 5;
  const page = request.query.page || 1;
  const start = ((page - 1) * numPerPage);

  let queryParams = {
    latitude: request.query.latitude,
    longitude: request.query.longitude,
    term: 'restaurant',
    offset: start,
    limit: numPerPage
  }

  superagent.get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .query(queryParams)
    .then(results => {
      const resultsArray = results.body.businesses;
      console.log('results', results.body);
      const restaurantData = resultsArray.map(eatery => new Restaurant(eatery));
      response.status(200).send(restaurantData);
    })
}

function movieHandler(request, response) {
  let city = request.query.search_query;
  let url = `https://api.themoviedb.org/3/search/movie`;

  let queryParams = {
    api_key: process.env.MOVIE_API_KEY,
    query: city,
    page: 1
  }

  superagent.get(url)
    .query(queryParams)
    .then(results => {
      let movieData = results.body.results.map(movie => {
        return new Movies(movie);
      });
      response.status(200).send(movieData);
    })
    .catch((error) => {
      console.log('ERROR', error);
      response.status(500).send('We done messed it up.');
    })
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

  let sql = 'SELECT * FROM locations WHERE search_query=$1;';
  let safeValues = [city];

  client.query(sql, safeValues)
    .then(resultsFromPostgres => {
      if (resultsFromPostgres.rowCount) {
        console.log('Found location in the database!');
        let locationObject = resultsFromPostgres.rows[0];
        response.status(200).send(locationObject);
      }
      else {
        console.log('Did not find location in the database.');
        superagent.get(url)
          .query(queryParams)
          .then(resultsFromSuperAgent => {
            let geoData = resultsFromSuperAgent.body;
            const obj = new Location(city, geoData);

            //save to database for later use
            let sql = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id;';
            let safeValues = [obj.search_query, obj.formatted_query, obj.latitude, obj.longitude];

            client.query(sql, safeValues);

            response.status(200).send(obj);
          }).catch((error) => {
            console.log('ERROR', error);
            response.status(500).send('Our bad. Wheels aren\'t spinning!');
          })
      }
    });
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

function Movies(obj) {
  this.title = obj.title;
  this.overview = obj.overview;
  this.average_votes = obj.vote_average;
  this.total_votes = obj.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${obj.poster_path}`;
  this.popularity = obj.popularity;
  this.released_on = obj.release_date;
}

function Restaurant(obj) {
  this.name = obj.name;
  this.image_url = obj.image_url;
  this.price = obj.price;
  this.rating = obj.rating;
  this.url = obj.url;
}

//====================================== turn on the server========================================
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`listening on ${PORT}`)
    })
  }).catch(err => console.log('ERROR', err));
