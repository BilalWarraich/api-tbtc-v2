//This module help to listen request
var express = require('express');
var router = express.Router();
const axios = require('axios');
let litecore = require("litecore-lib");
// var explorers = require('litecore-explorers');
// var insight = new explorers.Insight();

router.get("/create_wallet", async function (request, res) {
    let network = litecore.Networks.mainnet;
    let priv = new litecore.PrivateKey(network);
    let add = priv.toAddress().toString('hex');


    res.json({
        wallet: {
            privateKey: priv.bn,
            liteAddress: add
        }
    })
});

router.get('/getBalance/:walletAddress', async function (request, response) {
	var code = 200;
	var message = ``;
	var transactions = '';
	var ResponseData = null;
	var finalResponse = null;
	let errors = null;
	let checksum_address = null;
	
	try {
		console.log(request.params.walletAddress.length)
		if(request.params) {
			if (!request.params.walletAddress) {
				return errors = { error:{
					 code : 17,
					 message :`Required request body is missing`,
				  }}
			   
			 } 
			 else if (request.params.walletAddress.length < 30 || request.params.walletAddress.length > 34) {
				 return errors = { error:{
					code : 3000,
					message : request.params.walletAddress+ ` is not a valid Litecoin address`,
				 }}
			 }
			else {
				let walletAddress = request.params.walletAddress;
				
				var walletdetails = null;
				var date = new Date();
				var timestamp = date.getTime();
				let sent = 0;
				let received = 0;
				
				await axios.get(
					`https://api.blockcypher.com/v1/ltc/main/addrs/${request.params.walletAddress}`
				).then(res => {
					let transactions = res.data;
					walletdetails = transactions;
					if(transactions.n_tx > 0) {
						for (let i = 0; i < transactions.txrefs.length; i++) {
							if(transactions.txrefs[i].tx_input_n == -1) {
								received += 1;
							} else { 
								sent += 1;
							}
						}
					}
				});

				ResponseData = {
					payload: {
						address: walletAddress,
						totalSpent : walletdetails.total_sent,
						totalReceived : walletdetails.total_received,
						balance : walletdetails.balance,
						txi : received,
						txo : sent, 
						txsCount : walletdetails.n_tx, 
						addresses : [
							walletAddress
						]
					},
					message: "",
					status: 200,
					success: true
				};
				message = "Completed";
				code = 200;
				finalResponse = ResponseData.payload;
			}
		} else {
			message = "Transaction cannot proceeds as request params is empty";
			code = 204;
		}
	} catch (error) {
		return errors = { error: {
            code : 1,
            message :`General error: ${error}`,
         }};
	} finally {
		if (finalResponse==null) {	
			return response.status(200).json({
			 meta: errors
			
			});
		} else {
			return response.status(200).json({
				payload:finalResponse,
			});
		}
	}
	
	
});

router.get('/track/:hash', async function (req, response) {

    axios.get(`https://testnet.litecore.io/api/tx/${req.params.hash}`)
        .then((res) => {
            const transactions = res.data;

            response.json({
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
            });

        }).catch(err => response.status(404).json({
            hash: `Hash not Found ${err}`
        }))

});

router.get('/trackAddress/:walletAddress', function (req, res) {
    axios.get(
        "https://insight.litecore.io/api/txs/?address=" + req.params.walletAddress
    ).then(transaction =>
        res.status(200).json({
            transaction: transaction.data
        })).catch(err => {
        res.status(404).send({
            walletAddress: `${req.params.walletAddress} not found`
        })
    })
});

router.post('/transfer', async function (req, res) {


	var code = 200;
	var message = ``;
	var ResponseData = null;
	var finalResponse = null;
    let errors = null;
	 
	 try {
		if(request.body) {
			var reqBody = request.body; 
			var ValidationCheck = true;
			if (!reqBody.createTx.input[0].address) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3004,
					message :`fromAddress cannot be null or empty`,
				 }}
			
			}
			else if (!reqBody.createTx.outputs[0].address) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3005,
					message :`toAddress cannot be null or empty`,
				 }}
			}
			else if (!reqBody.wifs[0]) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3006,
					message :`privateKey cannot be null or empty`,
				 }}
			}
			else if (!reqBody.createTx.input[0].value) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3001,
					message :`Value is not provided`,
				 }}
			} 
			else if (!reqBody.createTx.fee[0].value) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3019,
					message :`Could not estimate gas price`,
				 }}
			} 
		
			else if (!reqBody.createTx.input[0].value === parseInt(reqBody.createTx.input[0].value)) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3011,
					message :`BigInt or BigDecimal conversion error`,
				 }}
			}
			
			if(ValidationCheck == true) {
				
				let from = reqBody.createTx.input[0].address;
				let privKeyWIF = reqBody.wifs[0];
				let to = reqBody.createTx.outputs[0].address;
				let value = reqBody.createTx.fee[0].value;
				let gasPrice = reqBody.createTx.fee[0].value;
				

				await axios.get(`https://insight.litecore.io/api/addr/${from}/utxo`).then(res => {

					var tx = bitcore.Transaction();
					tx.from(res.data);
					tx.to(to, (value)); // 1000 satoshis will be taken as fee.
					tx.fee(gasPrice);
					tx.change(from);
					tx.sign(privKeyWIF);

					//   /insight-api/tx/send
					axios.post("https://insight.litecore.io/api/tx/send", {
						"rawtx": tx.serialize()
					}).then(response => {
						res.json({
							transaction: response.data.txid
						})
					});
				}).catch(err => {
					res.status(400).json({
						error: `unexpected error occured ${err}`
					})
				});
				
				
				let count = 0;
				const balance =  web3.eth.getBalance(fromAddress);
				const weiBalance = web3.fromWei(balance.toNumber(), "ether");
				if (!request.body.nounce) {
					 count = await web3.eth.getTransactionCount(fromAddress);
				}
				else{
					count = request.body.nounce;
				}
			
				if (fromAddress.length < 42) {
					return errors = { error:{
						code : 3000,
						message : fromAddress+ ` is not a valid Ethereum address`,
					 }}
				} else if (toAddress.length < 42) {
					return errors = { error:{
						code : 3000,
						message : toAddress+ ` is not a valid Ethereum address`,
					 }}
				} 
				 else if (web3._extend.utils.isChecksumAddress(checksum_address_from)==false  ){    //Added by Aqeel
					 return errors = { error:{
						 code : 3000,
						 message : fromAddress+ ` is not a valid Ethereum address`,
					  }}
				
				 } else if( web3._extend.utils.isChecksumAddress(checksum_address_to)==false){
					 return errors = { error:{
					  code : 3000,
					  message : toAddress+ ` is not a valid Ethereum address`,
				   }}
				  }
				 else if(weiBalance <= etherValue){
					return errors = { error:{
						code : 3023,
						message : `Balance is not enough`,
					 }}
				 }
				 else if (toChecksum('0x'+Wallet.fromPrivateKey(Buffer.from(privateKey, 'hex')).getAddress().toString('hex')) != fromAddress){
					return errors = { error:{
						code : 3000,
						message : privateKey+` not a valid Ethereum Private key`,
					 }} 
				 }

				
				etherValue = web3.toWei(etherValue, "ether");
				web3.eth.defaultAccount = fromAddress;
		
					
					privateKey = Buffer.from(privateKey, "hex");
					var rawTransaction = {
						from: fromAddress,
						nonce: web3.toHex(count),
						gasPrice: web3.toHex(gasPrice),
						gasLimit: web3.toHex(gasLimit),
						to: toAddress,
						value: web3.toHex(etherValue),
						chainId: 0x01
				     };

				

					let tx = new Tx(rawTransaction);

					tx.sign(privateKey);
					let serializedTx = tx.serialize();
					let hashObj = await sendrawtransaction(serializedTx);
				
					if (hashObj.response == '') {
						let hash = hashObj.hash;
						ResponseData = {
							hex: hash
							}
						message = "Transaction successfully completed";
						code = 200;
						finalResponse = ResponseData;
					} else {
						return errors = hashObj.response;
					}
			
		    } else {
				code = 206
			}
		} else {
			return errors = { error:{
				code : 17,
				message : `Required request body is missing`,
			 }} 
		
		}
		
	} catch (error) {
		errors = { error:{
			code : 1,
			message :`General error:  ${error}`,
		 }
	 }
	 }
	finally {

		if (finalResponse==null){	
			return response.status(200).json({
			 meta : errors	
			});
		}else{
			return response.status(200).json({
			 payload:finalResponse,
			});
		}
	
			
	}
});

module.exports = router;