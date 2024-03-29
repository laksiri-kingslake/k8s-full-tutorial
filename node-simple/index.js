const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

async function start() {
    app.set('view engine', 'pug');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', async (req, res) => {
        res.render('index', { notes: [{ description: "Test 123" }, { description: "Test 456" }] });
    })

    app.listen(port, () => {
        console.log(`App listening on http://localhost:${port}`);
    })
}

start();