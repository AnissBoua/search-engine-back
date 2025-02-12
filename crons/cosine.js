const { Books, InvertedIndexing, tf_idfs, book_recommendations } = require('../models');
const BookService = require('../services/book');

const dotenv = require('dotenv');
dotenv.config();

async function evalueate_td_idf() {
    const IDFS_COUNT = await tf_idfs.count();
    let limit = 1000;
    let offset = 0;

    const stats = {};
    
    while (offset < IDFS_COUNT) {
        const idfs = await tf_idfs.findAll({ attributes: ['term', 'stats'], limit: limit, offset: offset });
        console.log("Fetched idfs from " + offset + " to " + (offset + limit));
        
        
        for (const tf of idfs) {
            const stat = {};
            for (const doc of tf.stats) {
                stat[doc.id] = doc.score;
            }
            stats[tf.term] = stat;
        }

        offset += limit;
    }

    console.log("Finished calculating stats");
    
    
    
    const tokens = await InvertedIndexing.findAll({ attributes: ['term'] });

    const BOOKS_COUNT = await Books.count();
    limit = 100;
    offset = 0;

    const documents = {};

    while (offset < BOOKS_COUNT) {
        const books = await Books.findAll({ attributes: ['id'], limit: limit, offset: offset });
        console.log("Fetched books from " + offset + " to " + (offset + limit));
        
        
        for (const book of books) {
            documents[book.id] = {};
            for (const token of tokens) {
                documents[book.id][token.term] = stats[token.term][book.id] || 0;
            }
        }

        offset += limit;
    }

    console.log("Finished calculating documents");

    const products = {};
    const norms = {};

    for (const A in documents) {
        for (const B in documents) {
            if (parseInt(A) == parseInt(B)) {
                products[A + '-' + B] = 0;
                norms[A + '-' + B] = 0;
            }
            if (parseInt(A) < parseInt(B)) {
                let product = 0;
                let normA = 0;
                let normB = 0;

                for (const term in documents[A]) {
                    product += documents[A][term] * documents[B][term];
                    normA += Math.pow(documents[A][term], 2);
                    normB += Math.pow(documents[B][term], 2);
                }

                normA = Math.sqrt(normA);
                normB = Math.sqrt(normB);

                products[A + '-' + B] = product;
                norms[A + '-' + B] = normA * normB;
            }
        }
    }

    const cosines = {};
    for (const key in products) {
        const [A, B] = key.split('-');
        if (cosines[A] === undefined) cosines[A] = {};
        cosines[A][B] = products[key] / norms[key] || 0;

        if (cosines[B] === undefined) cosines[B] = {};
        cosines[B][A] = products[key] / norms[key] || 0;
    }

    console.log("Finished calculating cosines");

    const batch = [];
    for (const cos in cosines) {
        const data = {
            book_id: cos,
            recommendations: [],
        }
        for (const rec in cosines[cos]) {
            data.recommendations.push({
                id: rec,
                score: cosines[cos][rec],
            });
        }

        batch.push(data);
    }

    console.log("Finished preparing batch");

    // Chunking the batch
    const chunk_size = 100;
    for (let i = 0; i < batch.length; i += chunk_size) {
        const chunk = batch.slice(i, i + chunk_size);
        await book_recommendations.bulkCreate(chunk);
        console.log("Inserted recommendations from " + i + " to " + (i + chunk_size));
    }
}


async function evalueate_td_idf_2() {
    const documents = {};
    const books = await Books.findAll({ attributes: ['id'] });

    for (const book of books) {
        documents[book.id] = {};
    }

    console.log("Finished calculating documents");



    const IDFS_COUNT = await tf_idfs.count();
    let limit = 10000;
    let offset = 0;

    const tokens = [];
    while (offset < IDFS_COUNT) {
        const idfs = await tf_idfs.findAll({ attributes: ['term', 'stats'], limit: limit, offset: offset });
        console.log("Fetched idfs from " + offset + " to " + (offset + limit));
        
        for (const tf of idfs) {
            tokens.push(tf.term);
            for (const doc of tf.stats) {
                documents[doc.id][tf.term] = doc.score;
            }
        }

        offset += limit;
    }

    console.log("Finished calculating stats");

    // for (const doc in documents) {
    //     for (const token in tokens) {
    //         if (documents[doc][token] === undefined) documents[doc][token] = 0;
    //     }

    //     console.log("Finished calculating stats for document " + doc);
    // }

    console.log("Finished calculating documents");

    const products = {};
    const norms = {};

    for (const A in documents) {
        for (const B in documents) {
            if (parseInt(A) == parseInt(B)) {
                products[A + '-' + B] = 0;
                norms[A + '-' + B] = 0;
            }
            if (parseInt(A) < parseInt(B)) {
                let product = 0;
                let normA = 0;
                let normB = 0;

                for (const term in documents[A]) {
                    product += documents[A][term] * documents[B][term];
                    normA += Math.pow(documents[A][term], 2);
                    normB += Math.pow(documents[B][term], 2);
                }

                normA = Math.sqrt(normA);
                normB = Math.sqrt(normB);

                products[A + '-' + B] = product;
                norms[A + '-' + B] = normA * normB;
            }
        }
    }

    const cosines = {};
    for (const key in products) {
        const [A, B] = key.split('-');
        if (cosines[A] === undefined) cosines[A] = {};
        cosines[A][B] = products[key] / norms[key] || 0;

        if (cosines[B] === undefined) cosines[B] = {};
        cosines[B][A] = products[key] / norms[key] || 0;
    }

    console.log("Finished calculating cosines");

    const batch = [];
    for (const cos in cosines) {
        const data = {
            book_id: cos,
            recommendations: [],
        }
        for (const rec in cosines[cos]) {
            data.recommendations.push({
                id: rec,
                score: cosines[cos][rec],
            });
        }

        batch.push(data);
    }

    console.log("Finished preparing batch");

    // Chunking the batch
    const chunk_size = 100;
    for (let i = 0; i < batch.length; i += chunk_size) {
        const chunk = batch.slice(i, i + chunk_size);
        await book_recommendations.bulkCreate(chunk);
        console.log("Inserted recommendations from " + i + " to " + (i + chunk_size));
    }
}

evalueate_td_idf();