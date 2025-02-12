const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const natural = require('natural');

class BookService {
    static async fetch_content(formats) {
        let texte = null;
        let html = null;
    
        for (const format in formats) {
            if (format.includes('text/plain')) texte = formats[format];
            if (format.includes('text/html')) html = formats[format];
        }
    
        if (texte !== null) {
            try {
                const { data } = await axios.get(texte);
                if (data) return data;

            } catch (error) {
                console.log("Error while fetching text content : " + error);                
            }
        }
    
        console.log("No text content found, trying to extract from html : " + html);

        try {
            // Html to text
            const { data } = await axios.get(html);
            
            const $ = cheerio.load(data);
            const text = $('body').text().trim();
            return text;
        } catch (error) {
            console.log("Error while fetching html content : " + error);
        }

        return null;            
    }

    static async fetch_image(formats, title) {
        const FORMATS = ['image/jpeg', 'image/png'];
        let image = null;
    
        for (const format in formats) {
            if (FORMATS.includes(format)) {
                image = formats[format];
                break;
            }
        }
    
        if (image === null) return null;
    
        try {
            const { data } = await axios.get(image, { responseType: 'arraybuffer' });
            const filename = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '-' + Date.now();
            const path = 'assets/images/' + filename + '.jpg';
            fs.writeFileSync(path, data, 'binary');
        
            return path;
        } catch (error) {
            console.log("Error while fetching image : " + error);
        }

        return null;
    }

    static tokenize(text) {
        const tokenizer = new natural.WordTokenizer();
        return tokenizer.tokenize(text);
    }

    static compute_page_rank(matrix, damping_factor = 0.85, max_iterations = 100, tolerance = 1e-6){
        const books = Object.keys(matrix);
        const n = books.length;

        let ranks = {};
        books.forEach(book => ranks[book] = 1 / n);

        for (let iter = 0; iter < max_iterations; iter++) {
            let new_ranks = {};
            let diff = 0;
    
            books.forEach(book => {
                let sum = 0;
                books.forEach(other_book => {
                    const outgoing_links = matrix[other_book] || [];
                    const link = outgoing_links.find(rec => rec.id === book);
                    
                    if (link) {
                        sum += ranks[other_book] * link.probability;
                    }
                });
    
                new_ranks[book] = (1 - damping_factor) / n + damping_factor * sum;
                diff += Math.abs(new_ranks[book] - ranks[book]);
            });
    
            ranks = new_ranks;

            if (diff < tolerance) {
                console.log("converged after", iter, "iterations");
                break;
            }
        }
    
        console.log(ranks);
        return ranks;
    }
}

module.exports = BookService;