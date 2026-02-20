const express = require("express");

const {register,login} = require("../controllers/UserC");

const userRoutes = express.Router();

userRoutes.post("/signUp",  register);


userRoutes.post("/login", login);




module.exports = {userRoutes};


