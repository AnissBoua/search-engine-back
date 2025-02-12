const { Books, InvertedIndexing } = require('../models');
const BookService = require('../services/book');

const dotenv = require('dotenv');
dotenv.config();

async function evalueate_indexes() {
    const inverted_indexing = Object.create(null);;
    const books = await Books.findAll({ attributes: ['id', 'content'] });

    for (const book of books) {
        // console.log(book.id);
        
        const tokens = BookService.tokenize(book.content);
        const indexes = Object.create(null);
        for (let token of tokens) {
            token = token.toLowerCase();
            if (indexes[token] === undefined) indexes[token] = 1;
            else indexes[token]++;
        }

        for (const token in indexes) {
            if (inverted_indexing[token] === undefined) inverted_indexing[token] = [];
            inverted_indexing[token].push({ id: book.id, count: indexes[token] });
        }
    }

    const batch = [];
    for (const term in inverted_indexing) {
        batch.push({ term: term, list: inverted_indexing[term] });
    }
    await InvertedIndexing.bulkCreate(batch);
}


evalueate_indexes();