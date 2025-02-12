const { Books, InvertedIndexing, tf_idfs, book_recommendations } = require('../models');
const BookService = require('../services/book');

const dotenv = require('dotenv');
dotenv.config();

async function evalueate_page_rank() {
    const recommendations = await book_recommendations.findAll();
    const matrix = recommendations.map(rec => rec.dataValues);
        
    const stochastic_matrix = {};
    matrix.forEach(book => {
        const total = book.recommendations.reduce((sum, rec) => sum + rec.score, 0);

        stochastic_matrix[book.book_id] = book.recommendations.map(rec => ({
            id: rec.id,
            probability: rec.score / total
        }));
    });

    const ranks = BookService.compute_page_rank(stochastic_matrix);

    for (const rank in ranks) {
        const book = await Books.findByPk(rank);
        book.page_rank = ranks[rank];
        await book.save();
    }
}

evalueate_page_rank();