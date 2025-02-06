const { Router } = require('express');
const axios = require('axios');

const { Op } = require('sequelize');
const { books, inverted_indexing } = require('../models');
const router = Router();

router.post('/search', async (req, res) => {
    const tokens = req.body.tokens;
    if (tokens === undefined) {
        res.status(400).send('Bad Request: words is required');
    }

    const results = {};
    for (const token of tokens) {
        const term = await inverted_indexing.findOne({ where: { term: {[Op.like]: "%" + token + "%"} } });
        if (term === null) continue;

        term.list = term.list.sort((a, b) => b.count - a.count);
        term.list = term.list.slice(0, 5);
        
        for (const item of term.list) {
            if (results[item.id] === undefined) results[item.id] = item.count;
            else results[item.id] += item.count;
        }
    }
    try {
        const data = require('../assets/books.json');
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;