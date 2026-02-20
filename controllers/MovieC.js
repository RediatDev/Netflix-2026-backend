const { text } = require("express");
const pool = require("../Schema/dbConfig.js");
const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");
const createMoviePreference = async (req, res) => {
  try {
    const { movieTitle } = req.body;
    const { userId } = req.user;

    // Validate input
    if (!userId || !movieTitle) {
      return res.status(400).json({
        message: "User ID and movie Title are required",
      });
    }

    // Optional: check if user exists
    const [users] = await pool.execute(
      "SELECT user_id FROM users WHERE user_id = ?",
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Insert movie preference
    const [result] = await pool.execute(
      "INSERT INTO movie_preferences (user_id, movieTitle) VALUES (?, ?)",
      [userId, movieTitle],
    );

    res.status(201).json({
      message: "Movie preference created successfully",
      preferenceId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating movie preference:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// first what we will show them to get preferred movies
// const getRecentMoviePreferences = async (req, res) => {
//   try {
//     const { userId } = req.user;

//     if (!userId) {
//       return res.status(400).json({ message: "User ID is required" });
//     }

//     // top 5  lememerate
//     const [preferences] = await pool.execute(`
//       SELECT movieTitle, MAX(created_at) as lastLiked
//       FROM movie_preferences
//       WHERE user_id = ?
//       GROUP BY movieTitle
//       ORDER BY lastLiked DESC
//       LIMIT 5
//     `, [userId]);

//     res.status(200).json({
//       message: "Recent preferences fetched successfully",
//       preferences: preferences.map(p => p.movieTitle)
//     });
//     console.log(preferences)
//   } catch (error) {
//     console.error("Error fetching recent preferences:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

//  then we will show them the AI updated Code

const getRecentMoviePreferences = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // top 5  lememerate
    const [preferences] = await pool.execute(
      `
      SELECT movieTitle, MAX(created_at) as lastLiked
      FROM movie_preferences
      WHERE user_id = ?
      GROUP BY movieTitle
      ORDER BY lastLiked DESC
      LIMIT 5
    `,
      [userId],
    );

    let preferencesList = preferences.map((p) => p.movieTitle);
    const movieTitles = preferencesList.join(", ");

    const ai = new GoogleGenAI({
      apiKey: process.env.Gemini_KEY,
    });

    const contents = [
      {
        text: `
  The user recently liked these movies: ${movieTitles}.

  Recommend 5 similar movies.

  Requirements:
  - Suggest real, officially released movies that are widely known and indexed in The Movie Database (TMDB).
  - Avoid unreleased, obscure, fan-made, or fictional titles.
  - Use the exact original English title as listed on TMDB.
  - Do not include TV shows unless they are also categorized as movies in TMDB.
  - Do not include explanations or numbering.
  - Return only a valid JSON array of movie titles.

  Example:
  ["Inception", "The Prestige", "Interstellar"]
  `,
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.6,
        maxOutputTokens: 200,
      },
    });

    const gimiSuggestionRaw = response.text;

    //   cleanup marege aleben mekeneyatum gemini Markdown fomatting yezo selememeta eneza meweged alebachew le TMDB kemelakachen befite
    const cleanedSuggestion = gimiSuggestionRaw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let gimiSuggestion;
    try {
      gimiSuggestion = JSON.parse(cleanedSuggestion);
    } catch (err) {
      console.error("Failed to parse Gemini response:", cleanedSuggestion);
      gimiSuggestion = [];
    }

    // If empty, return early
    if (!gimiSuggestion.length) {
      return res.status(200).json({
        message: "No movie suggestions returned by AI",
        movies: [],
      });
    }

    // Now safely map over gimiSuggestion
    const contactTMDB = await Promise.all(
      gimiSuggestion.map(async (title) => {
        const tmdbRes = await axios.get(
          "https://api.themoviedb.org/3/search/movie",
          {
            params: {
              api_key: process.env.TMDB_KEY,
              query: title,
            },
          },
        );
        return tmdbRes.data.results || [];
      }),
    );

    // Flatten, remove duplicates, pick first 6
    let allMovies = contactTMDB.flat();
    const uniqueMovies = [];
    const movieIds = new Set();
    allMovies.forEach((movie) => {
      if (movie && !movieIds.has(movie.id)) {
        movieIds.add(movie.id);
        uniqueMovies.push(movie);
      }
    });
    const moviesData = uniqueMovies.slice(0, 6);

    res.status(200).json({
      message: "Recent preferences fetched successfully",
      movies: moviesData,
    });
  } catch (error) {
    console.error("Error fetching recent preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createMoviePreference,
  getRecentMoviePreferences,
};
