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
            const { data } = await axios.get(texte);
            return data;
        }
    
        // Html to text
        const { data } = await axios.get(html);
        
        const $ = cheerio.load(data);
        const text = $('body').text().trim();
        return text;
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
    
        const { data } = await axios.get(image, { responseType: 'arraybuffer' });
        const filename = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '-' + Date.now();
        const path = 'assets/images/' + filename + '.jpg';
        fs.writeFileSync(path, data, 'binary');
    
        return path;
    }

    static tokenize(text) {
        const tokenizer = new natural.WordTokenizer();
        return tokenizer.tokenize(text);
    }
}

module.exports = BookService;