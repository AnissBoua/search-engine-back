const { Books, InvertedIndexing, tf_idfs } = require('../models');
const BookService = require('../services/book');

const dotenv = require('dotenv');
dotenv.config();

async function evalueate_td_idf() {
    const books_count = await Books.count();

    const limit = 100;
    let offset = 0;

    const tfs = Object.create(null);

    while (offset < books_count) {
        const books = await Books.findAll({ attributes: ['id', 'content'], limit: limit, offset: offset });
        console.log("Fetched books from " + offset + " to " + (offset + limit));
        

        for (const book of books) {
            const tokens = BookService.tokenize(book.content);
            const indexes = Object.create(null);
            for (let token of tokens) {
                token = token.toLowerCase();
                if (indexes[token] === undefined) indexes[token] = 1;
                else indexes[token]++;
            }

            for (const token in indexes) {
                if (tfs[token] === undefined) tfs[token] = Object.create(null);
                tfs[token][book.id] = indexes[token] / tokens.length;
            }
        }

        offset += limit;
    }

    console.log("Finished calculating tfs");
    

    const terms_count = await InvertedIndexing.count();
    const idfs = Object.create(null);

    offset = 0;

    while (offset < terms_count) {
        const terms = await InvertedIndexing.findAll({ attributes: ['term', 'list'], limit: limit, offset: offset });
        console.log("Fetched terms from " + offset + " to " + (offset + limit));
        
        for (const term of terms) {
            const idf = Math.log((books_count / term.list.length) || 1);
            idfs[term.term] = idf;
        }

        offset += limit;
    }

    console.log("Finished calculating idfs");

    const batch = [];
    for (const term in tfs) {
        const list = [];

        for (const book in tfs[term]) {
            const score = tfs[term][book] * idfs[term];
            list.push({ id: book, score: score });
        }

        batch.push({ term: term, stats: list });
    }

    console.log("Finished calculating tf-idfs");

    // Chunking the batch
    const size = 10000;
    for (let i = 0; i < batch.length; i += size) {
        const chunk = batch.slice(i, i + size);
        await tf_idfs.bulkCreate(chunk);
        console.log("Inserted tf-idfs from " + i + " to " + (i + size));
    }
}


evalueate_td_idf();