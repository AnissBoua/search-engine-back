const { Router } = require('express');
const axios = require('axios');

const { books, inverted_indexing, tf_idfs, book_recommendations } = require('../models');
const BookService = require('../services/book');

const router = Router();

router.get('/fetch', async (req, res) => {
    const page = req.query.page;
    if (page === undefined) {
        res.status(400).send('Bad Request: page is required');
    }

    try {
        // const { data } = await axios.get(process.env.GUTENDEX_API + '/books?languages=en&mime_type=text/plain&page=' + page);

        // Mock data
        const data = require('../assets/books.json');

        // data.results = data.results.slice(0, 1);

        for (const item of data.results) {
            const summary = item.summaries[0];
            const content = await BookService.fetch_content(item.formats);
            
            const image = await BookService.fetch_image(item.formats, item.title);
            
            let book = {
                titre: item.title,
                authors: item.authors,
                summary: summary,
                content: content,
                image: image,
            };
            book = await books.create(book);

            const tokens = BookService.tokenize(content);
            const indexes = {};
            for (let token of tokens) {
                token = token.toLowerCase();
                if (indexes[token] === undefined) indexes[token] = 1;
                else indexes[token]++;
            }

            for (const token in indexes) {
                const term = await inverted_indexing.findOne({ where: { term: token } });
                if (term === null) {
                    await inverted_indexing.create({
                        term: token,
                        list: [{
                            id: book.id,
                            count: indexes[token],
                        }],
                    });
                } else {
                    term.list = term.list.concat({
                        id: book.id,
                        count: indexes[token],
                    });
                    await term.save();
                }
            }
        }
        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/tf-idf', async (req, res) => {
    const terms = await inverted_indexing.findAll();
    const books_list = await books.findAll();

    const tfs = {};
    const idfs = {};

    for (const book of books_list) {
        const tokens = BookService.tokenize(book.content);
        const indexes = {};
        for (let token of tokens) {
            token = token.toLowerCase();
            if (indexes[token] === undefined) indexes[token] = 1;
            else indexes[token]++;
        }

        for (const token in indexes) {
            if (tfs[token] === undefined) tfs[token] = {};
            tfs[token][book.id] = indexes[token] / tokens.length;
        }
    }


    for (const term of terms) {
        const idf = Math.log((books_list.length / term.list.length) || 1);
        idfs[term.term] = idf;
    }

    const tf_idf = {};
    for (const term in tfs) {
        const list = [];

        for (const book in tfs[term]) {
            const score = tfs[term][book] * idfs[term];
            list.push({ id: book, score: score });
        }

        tf_idf[term] = list;
        
        await tf_idfs.create({
            term: term,
            stats: list,
        });
    }

    res.status(200).json(tf_idf);
});

// EN_COURS
router.get('/cosine', async (req, res) => {
    // select just the terms 
    const tokens = await inverted_indexing.findAll({
        attributes: ['term'],
    });
    const idfs = await tf_idfs.findAll();
    const book_list = await books.findAll();
    const stats = {};
    const documents = {};

    for (const tf of idfs) {
        const stat = {};
        for (const doc of tf.stats) {
            stat[doc.id] = doc.score;
        }
        stats[tf.term] = stat;
    }

    for (const book of book_list) {
        documents[book.id] = {};
        for (const token of tokens) {
            documents[book.id][token.term] = stats[token.term][book.id] || 0;
        }
    }

    const products = {};
    const norms = {};

    for (const A in documents) {
        for (const B in documents) {
            if (A < B) {
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
        cosines[key] = products[key] / norms[key];
    }

    
    res.status(200).json(cosines); 
});

router.get('/', async (req, res) => {
    await books.findAll()
        .then(books => {
            res.status(200).json(books);
        })
        .catch(error => {
            res.status(500).json({ error: error.message });
        });
});

router.get('/:id', (req, res) => {
    const id = req.params.id;
    books.findByPk(id)
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