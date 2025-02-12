const { Router } = require('express');
const axios = require('axios');
const numeric = require('numeric');

const { Books, InvertedIndexing, tf_idfs, book_recommendations } = require('../models');
const BookService = require('../services/book');

const natural = require('natural');

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
        const terms = await InvertedIndexing.findAll({attributes: ['term']});
    
        const suggestions = terms.map(term => {
            return {
                term: term.term,
                distance: natural.LevenshteinDistance(search, term.term)
            }
        });

        suggestions.sort((a, b) => a.distance - b.distance);
        res.status(200).json({ books: [], recommendations: [], suggestion: suggestions[0].term });
        return;
    }

    books_list = books_list.stats.sort((a, b) => b.score - a.score).slice(0, 10);
    const scores = books_list.map(book => {
        return {
            id: parseInt(book.id),
            score: book.score
        }
    });

    books_list = books_list.map(id => id.id);
    books_list = await Books.findAll({ where: { id: books_list } });
    

    const coeff = {
        title: 0.3,
        author: 0.3,
        tf_idf: 0.25,
        score: 0.15,

    }
    books_list = books_list.map(book => {
        let author = "";
        for (const a of book.authors) {
            author += a.name + " ";
        }

        return {
            ...book.dataValues,
            // final_score: (coeff.tf_idf * book.score) + (coeff.score * book.page_rank)
            final_score: (coeff.title * natural.JaroWinklerDistance(search, book.titre)) + (coeff.author * natural.JaroWinklerDistance(search, author)) + (coeff.tf_idf * scores.find(score => score.id === book.id).score) + (coeff.score * book.page_rank)
        }
    });
    books_list = books_list.sort((a, b) => b.final_score - a.final_score);

    let recommendations = await book_recommendations.findOne({ where: { book_id: books_list[0].id,  } });
    recommendations = recommendations.recommendations.sort((a, b) => b.score - a.score).map(rec => rec.id).slice(0, 5);
    recommendations = await Books.findAll({ where: { id: recommendations } });
    recommendations = recommendations.sort((a, b) => b.page_rank - a.page_rank);

    res.status(200).json({ books: books_list, recommendations: recommendations, suggestion: "" });
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