const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const { AllRouters } = require('./AllRoutes');
const pool = require('./Schema/dbConfig'); // your mysql2 pool


const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: true,
  exposedHeaders: ['Authorization']
}));

app.use('/api', AllRouters);

app.get('/test', (req, res) => {
  res.send('Backend is working');
});

// Function to check DB connection
async function checkDBConnection() {
  try {
    const connection = await pool.getConnection();
    connection.release(); // release back to pool
    console.log("Database connected successfully ✅");
  } catch (err) {
    console.error("Unable to connect to the database:", err);
    process.exit(1); // stop server if DB is not connected
  }
}

// Start server after DB connection check
async function startServer() {
  await checkDBConnection();

  app.listen(process.env.PORT, () => {
    console.log(`Server is listening on port ${process.env.PORT}`);
  });
}

startServer();
