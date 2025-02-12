const { Router } = require('express');
const axios = require('axios');
const numeric = require('numeric');

const { Books, InvertedIndexing, tf_idfs, book_recommendations } = require('../models');
const BookService = require('../services/book');

const router = Router();

router.get('/', async (req, res) => {
    await Books.findAll()
        .then(books => {
            res.status(200).json(books);
        })
        .catch(error => {
            res.status(500).json({ error: error.message });
        });
});

router.get('/search', async (req, res) => {
    let search = req.query.search;
    if (search === undefined || search === '') {
        res.status(400).send('Bad Request: search is required');
    }

    // console.log(search);
    const book = await Books.findOne({ where: { titre: search } });
    if (book !== null) {
        let recommendations = await book_recommendations.findOne({ where: { book_id: book.id,  } });
        recommendations = recommendations.recommendations.sort((a, b) => b.score - a.score).map(rec => rec.id).slice(0, 5);
        recommendations = await Books.findAll({ where: { id: recommendations } });
        recommendations = recommendations.sort((a, b) => b.page_rank - a.page_rank);

        res.status(200).json({ books: [book], recommendations: recommendations });
        return;
    }

    search = search.toLowerCase();
    search = search.split(' ')[0];

    let books_list = await tf_idfs.findOne({ where: { term: search } });
    if (books_list === null) {
        res.status(200).json({ books: [], recommendations: [] });
        return;
    }

    books_list = books_list.stats.sort((a, b) => b.count - a.count).map(rec => rec.id).slice(0, 10);
    books_list = await Books.findAll({ where: { id: books_list } });
    
    const tfidf_coeff = 0.7;
    const score_coeff = 0.3;
    books_list = books_list.map(book => {
        return {
            ...book.dataValues,
            final_score: (tfidf_coeff * book.score) + (score_coeff * book.page_rank)
        }
    });
    books_list = books_list.sort((a, b) => b.final_score - a.final_score);

    let recommendations = await book_recommendations.findOne({ where: { book_id: books_list[0].id,  } });
    recommendations = recommendations.recommendations.sort((a, b) => b.score - a.score).map(rec => rec.id).slice(0, 5);
    recommendations = await Books.findAll({ where: { id: recommendations } });
    recommendations = recommendations.sort((a, b) => b.page_rank - a.page_rank);

    res.status(200).json({ books: books_list, recommendations: recommendations });
});

router.get('/:id', (req, res) => {
    const id = req.params.id;
    Books.findByPk(id)
        .then(book => {
            if (book === null) {
                res.status(404).send('Book not found');
            } else {
                res.status(200).json(book);
            }
        })
        .catch(error => {
            res.status(500).json({ error: error.message });
        });
});

module.exports = router;