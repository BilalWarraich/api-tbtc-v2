//This module help to listen request
var express = require('express');
var router = express.Router();
const axios = require('axios');
// const bch = require('bchaddrjs');
var bitcore = require('bitcore-lib');
const bch = require('bitcore-lib-cash')


// // ---------------------------------Create Account----------------------------------------------
router.get("/create_wallet", async function (request, res) {
	var ResponseCode = 200;
	var ResponseMessage = ``;
	var ResponseData = null;
	try {
		
		let network = bch.Networks.testnet;
		let priv = new bch.PrivateKey(network);
		let add = priv.toAddress().toString(bch.Address.DefaultFormat);
		
		ResponseData = {
			wallet: {
				privateKey: priv.bn,
				cashAddress: add.replace("bchtest:", "")
			}
		};
		ResponseMessage = "Completed";
		ResponseCode = 200;
	} catch (error) {
		ResponseMessage = `Transaction signing stops with the error ${error}`;
		ResponseCode = 400;
	} finally {
		return res.status(200).json({
			code : ResponseCode,
			data : ResponseData,
			msg : ResponseMessage
		});
	}
});

router.get('/getBalance/:walletAddress', function (req, response) {
	var ResponseCode = 200;
	var ResponseMessage = ``;
	var ResponseData = null;
	try {
	
		if(req.params) {
			if (!req.params.walletAddress) {
				ResponseMessage = "wallet address is missing \n";
				ResponseCode = 206;
			} else {
				var xmlHttp = new XMLHttpRequest();
				var walletAddress = req.params.walletAddress;
				xmlHttp.open( "GET", 'https://test-bch-insight.bitpay.com/api/addr/' + walletAddress+'/?noTxList=1', false ); // false for synchronous request
				xmlHttp.send();
				var transactions = JSON.parse(xmlHttp.responseText);
				ResponseData = {
					balance: transactions.balance
				};
				ResponseMessage = "Completed";
				ResponseCode = 200;
			}
		} else {
			ResponseMessage = "Transaction cannot proceeds as request params is empty";
			ResponseCode = 204;
		}
	} catch (error) {
		ResponseMessage = `Transaction signing stops with the error ${error}`;
		ResponseCode = 400;
	} finally {
		return response.status(200).json({
			code : ResponseCode,
			data : ResponseData,
			msg : ResponseMessage
		});
	}
});

router.get('/track/:hash', async function (req, response) {
	var ResponseCode = 200;
	var ResponseMessage = ``;
	var ResponseData = null;
	try {
	
		if(req.params) {
			if (!req.params.hash) {
				ResponseMessage = "wallet address is missing \n";
				ResponseCode = 206;
			} else {
				var xmlHttp = new XMLHttpRequest();
				var hash = req.params.hash;
				xmlHttp.open( "GET", 'https://test-bch-insight.bitpay.com/api/tx/' + hash, false ); // false for synchronous request
				xmlHttp.send();
				var transactions = JSON.parse(xmlHttp.responseText);
				ResponseData = {
					transaction: {
						hash: transactions.txid,
						from: transactions.vin[0].addr,
						to: transactions.vout[0].scriptPubKey.addresses[0],
						amount: transactions.vout[0].value,
						fee: transactions.fees,
						block: transactions.blockheight,
						n_confirmation: transactions.confirmations,
						link: `https://blockexplorer.com/tx/${req.params.hash}`
					},
					message: "",
					timestamp: transactions.time,
					status: 200,
					success: true
				};
				ResponseMessage = "Completed";
				ResponseCode = 200;
			}
		} else {
			ResponseMessage = "Transaction cannot proceeds as request params is empty";
			ResponseCode = 204;
		}
	} catch (error) {
		ResponseMessage = `Transaction signing stops with the error ${error}`;
		ResponseCode = 400;
	} finally {
		return response.status(200).json({
			code : ResponseCode,
			data : ResponseData,
			msg : ResponseMessage
		});
	}
});

router.get('/trackAddress/:walletAddress', function (req, res) {
	
	var ResponseCode = 200;
	var ResponseMessage = ``;
	var ResponseData = null;
	try {
	
		if(req.params) {
			if (!req.params.walletAddress) {
				ResponseMessage = "wallet address is missing \n";
				ResponseCode = 206;
			} else {
				var xmlHttp = new XMLHttpRequest();
				var walletAddress = req.params.walletAddress;
				xmlHttp.open( "GET", 'https://test-bch-insight.bitpay.com/api/txs/?address=' + walletAddress, false ); // false for synchronous request
				xmlHttp.send();
				var transactions = JSON.parse(xmlHttp.responseText);
				ResponseData = {
					transaction: transactions
				};
				ResponseMessage = "Completed";
				ResponseCode = 200;
			}
		} else {
			ResponseMessage = "Transaction cannot proceeds as request params is empty";
			ResponseCode = 204;
		}
	} catch (error) {
		ResponseMessage = `Transaction signing stops with the error ${error}`;
		ResponseCode = 400;
	} finally {
		return res.status(200).json({
			code : ResponseCode,
			data : ResponseData,
			msg : ResponseMessage
		});
	}
});

router.post('/transfer', async function (request, response) {
	var ResponseCode = 200;
	var ResponseMessage = ``;
	var ResponseData = null;
	
	try {
		if(request.body) {
			var ValidationCheck = true;
			if (!request.body.from_address) {
				ResponseMessage = "from address is missing \n";
				ValidationCheck = false;
			}
			if (!request.body.to_address) {
				ResponseMessage += "to address is missing \n";
				ValidationCheck = false;
			}
			if (!request.body.from_private_key) {
				ResponseMessage += "private key is missing \n";
				ValidationCheck = false;
			}
			if (!request.body.value) {
				ResponseMessage += "value is missing \n";
				ValidationCheck = false;
			} else if (!request.body.value === parseInt(request.body.value)) {
				ResponseMessage += "value must be a number \n";
				ValidationCheck = false;
			}
			
			if(ValidationCheck == true) {
				let from = request.body.from_address;
				let to = request.body.to_address;
				let privKeyWIF = request.body.from_private_key;
				let value = parseInt(request.body.value);
				var xmlHttp = new XMLHttpRequest();
				xmlHttp.open( "GET", 'https://test-bch-insight.bitpay.com/api/addr/' + from + '/utxo', false ); // false for synchronous request
				xmlHttp.send();
				var transactions = JSON.parse(xmlHttp.responseText);
				
				let privateKey;
				try {
					privateKey = bch.PrivateKey.fromWIF(privKeyWIF);
				} catch (error) {
					ResponseMessage = `private key is invalid : ${error}`;
					ResponseCode = 400;
					return;
				}
				let _fromAddress = privateKey.toAddress();
				
				
				var tx = bch.Transaction();
				tx.from(transactions);
				tx.to(to, (value)); // 1000 satoshis will be taken as fee.
				tx.fee(50000);
				tx.change(from);
				tx.sign(privKeyWIF);
				//ResponseMessage = tx.serialize();
				//   /insight-api/tx/send
				await new Promise((resolve, reject) => {
					axios.post("https://test-bch-insight.bitpay.com/api/tx/send", {
						"rawtx": tx.serialize()
					}).then(res => {
						console.log(res)
						ResponseData = {
							transaction: res.data.txid
						};
						ResponseMessage = "Completed";
						ResponseCode = 200;
						resolve(res);
					}).catch(err => {
						ResponseMessage = `${err}`;
						ResponseCode = 400;
					   reject(err);
					});
				});
				
			} else {
				ResponseCode = 206
			}
		} else {
			ResponseMessage = "Transaction cannot proceeds as request body is empty";
			ResponseCode = 204
		}
		
	} catch (error) {
		ResponseMessage = `Transaction signing stops with the error ${error}`;
		ResponseCode = 400
	} finally {
		return response.status(200).json({
			code : ResponseCode,
			data : ResponseData,
			msg : ResponseMessage
		});
	}

});

module.exports = router;