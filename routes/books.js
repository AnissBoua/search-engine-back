const { Router } = require('express');
const axios = require('axios');
const numeric = require('numeric');

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

        await book_recommendations.create(data);
    }

    
    res.status(200).json(cosines); 
});

// router.get('/scoring', async (req, res) => {
//     const cosines = await book_recommendations.findAll();
//     let copy = {};
//     // Normalize the columns
//     for (const cosine of cosines) {
//         let sum = 0;
//         copy[cosine.book_id] = {};

//         for (const rec of cosine.recommendations) {
//             copy[cosine.book_id][rec.id] = rec.score;
//         }
//     }


//     const sum = {};
//     for (const row in copy) {
//         for (const col in copy[row]) {
//             sum[col] = sum[col] + copy[row][col] || copy[row][col];
//         }
//     }

//     for (const row in copy) {
//         for (const col in copy[row]) {
//             copy[row][col] = copy[row][col] / sum[col];
//         }
//     }

//     const threshold = 0.01;
//     let iteration = 0;
//     let norm = Infinity;
//     let M = copy;

//     while (norm > threshold) {
//         norm = spectral_norm(M);
        
//         if (norm > threshold) {
//             M = numeric.dot(M, M); // Multiply M * M
//         }
        
//         iteration++;
//     }
    
//     console.log(`Converged after ${iteration} iterations.`);
//     res.status(200).json(M);
// });

router.get("/score", async (req, res) => {
    const recommendations = await book_recommendations.findAll();
    const matrix = recommendations.map(rec => rec.dataValues);
        
    const stochastic_matrix = {};
    matrix.forEach(book => {
        const totalScore = book.recommendations.reduce((sum, rec) => sum + rec.score, 0);

        stochastic_matrix[book.book_id] = book.recommendations.map(rec => ({
            id: rec.id,
            probability: rec.score / totalScore
        }));
    });

    const ranks = BookService.compute_page_rank(stochastic_matrix);

    for (const rank in ranks) {
        const book = await books.findByPk(rank);
        book.page_rank = ranks[rank];
        await book.save();
    }
    res.json(ranks);
});

function spectral_norm(matrix) {
    // Convert object-based matrix to a 2D array
    const rows = Object.keys(matrix);
    const cols = Object.keys(matrix[rows[0]]);
    let mat = rows.map(row => cols.map(col => matrix[row][col] || 0));

    // Compute Singular Value Decomposition (SVD)
    const svd = numeric.svd(mat);

    // Return the largest singular value (spectral norm)
    return Math.max(...svd.S);
}

router.get('/', async (req, res) => {
    await books.findAll()
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

    console.log(search);
    const book = await books.findOne({ where: { titre: search } });
    if (book !== null) {
        let recommendations = await book_recommendations.findOne({ where: { book_id: book.id,  } });
        recommendations = recommendations.recommendations.sort((a, b) => b.score - a.score).map(rec => rec.id).slice(0, 5);
        recommendations = await books.findAll({ where: { id: recommendations } });
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
    books_list = await books.findAll({ where: { id: books_list } });
    books_list = books_list.sort((a, b) => b.page_rank - a.page_rank);

    let recommendations = await book_recommendations.findOne({ where: { book_id: books_list[0].id,  } });
    recommendations = recommendations.recommendations.sort((a, b) => b.score - a.score).map(rec => rec.id).slice(0, 5);
    recommendations = await books.findAll({ where: { id: recommendations } });
    recommendations = recommendations.sort((a, b) => b.page_rank - a.page_rank);

    res.status(200).json({ books: books_list, recommendations: recommendations });
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