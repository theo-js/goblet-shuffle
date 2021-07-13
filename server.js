const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const initializeSockets = require('./sockets');

// Views setup
app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/views');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({
	extended: true
}));
app.disable('x-powered-by');
app.use((req, res, next) => {
	// CORS middleware
	if (process.env.NODE_ENV !== 'production') {
		res.set('Access-Control-Allow-Origin', '*');
	} else {
		res.set('Access-Control-Allow-Origin', process.env.DOMAIN_NAME);
	}
	// Allow service worker
	res.set('Service-Worker-Allowed', '/');
	next();
});
app.use('/static', express.static(`${__dirname}/public/static`));

// Websockets
initializeSockets(server);

// Routes
const { multiplayerRouter } = require('./api/routes/multiplayer');
const { pushRouter } = require('./api/routes/push');
const rootRouter = require('./routes');
app.use('/api/multiplayer', multiplayerRouter);
app.use('/api/push', pushRouter);
app.use('', rootRouter);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`App running on ${process.env.DOMAIN_NAME || 'http://localhost'}:${PORT}`));

module.exports = app;