const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const initializeSockets = require('./sockets');

// Views setup
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({
	extended: true
}));
app.use('/static', express.static(`${__dirname}/static`));
app.disable('x-powered-by');

// Websockets
initializeSockets(server);

// Routes
const { multiplayerRouter } = require('./api/routes/multiplayer');
const rootRouter = require('./routes');
app.use('/api/multiplayer', multiplayerRouter);
app.use('', rootRouter);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`App running on http://localhost:${PORT}`));

module.exports = app;