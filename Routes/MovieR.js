const express = require("express");

const {createMoviePreference,getRecentMoviePreferences} = require("../controllers/MovieC");
const {authenticateToken} = require('../Auth/Auth')


const movieRoutes = express.Router();

movieRoutes.post("/createPreference",authenticateToken,  createMoviePreference);
movieRoutes.get("/getPreference",authenticateToken,  getRecentMoviePreferences);





module.exports = {movieRoutes};

