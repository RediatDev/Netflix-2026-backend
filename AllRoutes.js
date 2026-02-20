const express = require ('express')
const  {userRoutes}= require('./Routes/UserR')
const {movieRoutes} = require('./Routes/MovieR')




const AllRouters = express.Router()


AllRouters.use('/user',userRoutes)
AllRouters.use('/movie',movieRoutes)


module.exports = {AllRouters}