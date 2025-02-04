const books = require('./routes/books');

const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());
app.use('/api/books', books);

const models = require('./models');
models.sequelize.sync().then(() => {
    app.listen(process.env.APP_PORT, () => {
        console.log("Server is running on http://localhost:" + process.env.APP_PORT);
    });
});
