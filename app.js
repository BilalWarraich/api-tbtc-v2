var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

var $ = jQuery = require('jquery')(window);
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.json({
    type: 'application/json'
}));
app.use(bodyParser.urlencoded({
    extended: true
}));

var eth = require('./controllers/Ethereum/eth');
var usdt = require('./controllers/Tether/usdt')
var btc = require('./controllers/Bitcoin/btc');
var ltc = require('./controllers/Litcoin/ltc');
var tbtc = require('./controllers/Bitcoin/testbtc');
var test = '';

$.get('https://api.blockcypher.com/v1/btc/test3/addrs/n4VQ5YdHf7hLQ2gWQYYrcxoE5B7nWuDFNF/full?before=300000')
  .then(function(d) {console.log(d)});






app.use('/api/eth', eth);
app.use('/api/usdt', usdt);
app.use('/api/btc',btc);
app.use('/api/ltc', ltc);
app.use('/api/testbtc', tbtc)




app.get('/', function (request, response) {

    response.contentType('application/json');
    response.end(JSON.stringify("Node is running"));

});

app.get('*', function (req, res) {
    return res.status(200).json({
		code : 404,
		data : null,
		msg : 'Invalid Request {URL Not Found}'
    });
});

app.post('*', function (req, res) {
    return res.status(200).json({
        code : 404,
		data : null,
		msg : 'Invalid Request {URL Not Found}'
    });
});

if (module === require.main) {

    var server = app.listen(process.env.PORT || 80, function () {
        var port = server.address().port;
        console.log('App listening on port %s', port);
    });

}
