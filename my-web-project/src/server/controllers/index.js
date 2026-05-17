const express = require('express');
const router = express.Router();

// Example controller function for handling a GET request
router.get('/', (req, res) => {
    res.send('Welcome to the API!');
});

// Example controller function for handling a POST request
router.post('/data', (req, res) => {
    const data = req.body;
    // Process the data here
    res.status(201).send({ message: 'Data received', data });
});

// Export the router to be used in the routes file
module.exports = router;