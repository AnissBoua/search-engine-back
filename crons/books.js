const { Books } = require('../models');
const BookService = require('../services/book');

const axios = require('axios');

const dotenv = require('dotenv');
dotenv.config();

async function fetching_books() {
    const pages = 58;
    const start = 52;
    const skip = [14005];

    for (let page = start; page <= (pages); page++) {
        let books = [];
        try {
            const { data } = await axios.get(process.env.GUTENDEX_API + '/books?languages=en&mime_type=text/plain&page=' + page);

            for (const item of data.results) {
                if (skip.includes(item.id)) continue;
                
                // if (item.id != 51155) continue; // Debugging
                
                const summary = item.summaries[0];
                const content = await BookService.fetch_content(item.formats);
                const image = await BookService.fetch_image(item.formats, item.title);
                
                let book = {
                    api_id: item.id,
                    titre: item.title,
                    authors: item.authors,
                    summary: summary,
                    content: content,
                    image: image,
                };
                books.push(book);
            }

            // Get ready : batch insert
            await Books.bulkCreate(books);
            console.info("Books fetched at page : " + page);
        } catch (error) {
            console.warn("Failed to fetch books at page : " + page);
            for (const book of books) {
                book.content = null;
                book.summary = null;
            }
            console.warn("Books fetched : ", books);
            console.error(error);
        }
    }
}


fetching_books();