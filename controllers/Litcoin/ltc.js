//This module help to listen request
var express = require('express');
var router = express.Router();
const axios = require('axios');
var litecore = require("litecore-lib");
var explorers = require('litecore-explorers');
var insight = new explorers.Insight('mainnet');
let bech32 = require('bech32')
const crypto = require('crypto');
const EC = require('elliptic').ec;
const RIPEMD160 = require('ripemd160');
const bs58 = require('bs58');
const buffer = require('buffer');
const ec = new EC('secp256k1');


function hasha256(data) {
	return crypto.createHash('sha256').update(data).digest();
} // A small function I created as there is a lot of sha256 hashing.


// router.get("/create_wallet", async function (request, res) {
    // let network = litecore.Networks.mainnet;
    // let priv = new litecore.PrivateKey(network);
    // let add = priv.toAddress().toString('hex');


    // res.json({
        // wallet: {
            // privateKey: priv.bn,
            // liteAddress: add
        // }
    // })
// });

router.get('/track/:hash', async function (request, response) {
	var ResponseCode = 200;
	var ResponseMessage = ``;
	var ResponseData = null;
	try {
		if(request.params) {
			if (!request.params.hash) {
				ResponseMessage = "hash is missing \n";
				ResponseCode = 206;
			} else {
				let hash = request.params.hash;
				if (hash.length == 64) {
					var xmlHttp = new XMLHttpRequest();
					xmlHttp.open( "GET", 'https://insight.litecore.io/api/tx/' + hash, false ); // false for synchronous request
					xmlHttp.send();
					var transactions = JSON.parse(xmlHttp.responseText);
					ResponseData = transactions;
					// ResponseData = {
						// transaction: {
							// hash: transactions.txid,
							// currency: "BTC",
							// from: transactions.vin[0].addr,
							// to: transactions.vout[0].scriptPubKey.addresses[0],
							// amount: transactions.vout[0].value,
							// fee: transactions.fees,
							// block: transactions.blockheight,
							// n_confirmation: transactions.confirmations,
							// link: `https://testnet.blockexplorer.com/tx/${hash}`
						// },
						// message: "",
						// timestamp: transactions.time,
						// status: 200,
						// success: true
					// };
					ResponseMessage = "Completed";
					ResponseCode = 200;
				}  else {
					ResponseMessage = "Invalid Hash"
					ResponseCode = 400;
				}
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

router.get('/getBalance/:walletAddress', async function (request, response) {
	var code = 200;
	var message = ``;
	var transactions = '';
	var ResponseData = null;
	var finalResponse = null;
	let errors = null;
	
	try {
		//console.log(request.params.walletAddress.length)
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
					message : request.params.walletAddress+ ` is not a valid litecoin address`,
				 }}
			 }
			else {
				let walletAddress = request.params.walletAddress;
				
				var walletdetails = null;
				var date = new Date();
				var timestamp = date.getTime();
				let sent = 0;
				let received = 0;
				let page = 0;

				// await axios.get(
					// `https://insight.litecore.io/api/txs/?address=${request.params.walletAddress}`
					// //`https://api.blockcypher.com/v1/btc/main/addrs/${request.params.walletAddress}`
				// ).then(res => {

	                // for (let i = 0; i < res.data.txs.length; i++) {
						// var confrim = res.data.txs[i].confirmations;
		                   // var recvSide = String(res.data.txs[i].vout[0].scriptPubKey["addresses"]);
						   // var result = recvSide.substr(0, 36);
						   // if(confrim > 0 ){
		                   // if(result===request.params.walletAddress){
			            	 // received += 1;
			                // }
	                 	   // var sendSide = String(res.data.txs[i].vin[0].addr);
		                   // var result = sendSide.substr(0, 36);
		                   // if(result===request.params.walletAddress){
				             // sent += 1;
							// }
						// }
						// }
					   // page  = res.data.pagesTotal;
					// });



	            // if(page>1){ 
	       	     // for(let cnt = 1; cnt< page; cnt++){
		          // await  axios.get(
			      // `https://insight.litecore.io/api/txs/?address=${request.params.walletAddress}&pageNum=${cnt}`
		           // ).then(res => {
                   // for (let i = 0; i < res.data.txs.length; i++) {
				   // var recvSide = String(res.data.txs[i].vout[0].scriptPubKey["addresses"]);
				   // var result = recvSide.substr(0, 36);
				   // if(result===request.params.walletAddress){
					 // received += 1;
					// }
				   // var sendSide = String(res.data.txs[i].vin[0].addr);
				   // var result = sendSide.substr(0, 36);
				   // if(result===request.params.walletAddress){
					 // sent += 1;
					// }
				// }})
		
	           // }
	           // }

				


				await axios.get(
					`https://insight.litecore.io/api/addr/${request.params.walletAddress}/?noTxList=1`
				    ).then(res => {
					
					let transactions = res.data;
				//console.log("ltc ", transactions)
				ResponseData = {
					payload: {
						address: transactions.addrStr,
						totalSpent : transactions.totalSent,
						totalReceived : transactions.totalReceived,
						balance : transactions.balance,
						txi : sent,
						txo : received, 
						txsCount : transactions.txApperances, 
						addresses : [
							walletAddress
						]
					},
					message: "",
					status: 200,
					success: true
				};
			});	message = "Completed";
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
			return response.status(400).json({
			 meta: errors,
			 source : 'offical'
			
			});
		} else {
			return response.status(200).json({
				payload:finalResponse,
			 source : 'offical'
			});
		}
	}
	
	
});

router.post('/transfer', async function (request, response) {


	var code = 200;
	var message = ``;
	var ResponseData = null;
	var finalResponse = null;
    let errors = null;
	 
	 try {
		if(request.body) {
			var reqBody = request.body; 
			var ValidationCheck = true;
			if (!reqBody.createTx.inputs[0].address) {
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
			else if (!reqBody.createTx.inputs[0].value) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3001,
					message :`Value is not provided`,
				 }}
			} 
			else if (!reqBody.createTx.fee.value) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3019,
					message :`Could not estimate gas price`,
				 }}
			} 
		
			else if (!reqBody.createTx.inputs[0].value === parseInt(reqBody.createTx.inputs[0].value)) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3011,
					message :`BigInt or BigDecimal conversion error`,
				 }}
			}
			
			if(ValidationCheck == true) {
				
				let from = reqBody.createTx.inputs[0].address;
				let privKeyWIF = reqBody.wifs[0];
				let to = reqBody.createTx.outputs[0].address;
				let value =  	Math.round(reqBody.createTx.inputs[0].value * 100000000);
				var toValue =  Math.round(reqBody.createTx.outputs[0].value * 100000000);
				let gasPrice = Math.round(reqBody.createTx.fee.value * 100000000);
				
				var txserialize = null;
				let balance = 0;
				
				 if(value != toValue){
				return errors = { error:{
					code : 2206,
					message :`Conflict in the value to be send`,
				 }}
				}
				// if(from != feesAddress){
					// return errors = { error:{
						// code : 2206,
						// message :`Trying to deduct fees from another address`,
					 // }}
				// }
				// if (to.length < 34 || to.length > 34) {
					// return errors = { error:{
						// code : 2206,
						// message :`to' address is not valid`,
					 // }}
					
				// }
				// if (from.length < 34 || from.length > 34) {
					// return errors = { error:{
						// code : 2203,
						// message :`from' address is not valid`,
					 // }}
					
				// }
				await axios.get(
					`https://api.blockcypher.com/v1/ltc/main/addrs/${from}/balance`
				).then(res => {
					balance=res.data.balance;
				})
				//console.log("bal:",balance)
				if(Number(balance) >= (Number(value)+Number(gasPrice))) {
				
					await axios.get(`https://insight.litecore.io/api/addr/${from}/utxo`).then(res => {
						var privateKey = litecore.PrivateKey(privKeyWIF);
						var tx = litecore.Transaction();
						// console.log(res.data);
						tx.from(res.data);
						tx.to(to, value);
						if(Number(balance) - (Number(value)+Number(gasPrice)) < 10000) {
							
						} else {
							tx.change(from);
						}
						
						tx.fee(gasPrice);
						
						tx.sign(privateKey);
						txserialize =  tx.serialize();
						
						//txserialize = tx.serialize();
						
					}).catch(err => {
						response.status(400).json({
							error: `unexpected error occured ${err}`
						})
					});
					
					var broadcastObj = await walletbroadcast(txserialize);
					if(broadcastObj.response == '') { 
						
						ResponseMessage = "Transaction successfully completed";
						ResponseCode = 200;
						ResponseData = {
							txid:broadcastObj.data
						}
						finalResponse = ResponseData;
							
					} else {
						 return errors = { error:{
							code : 2003,
							message : broadcastObj.response,
						 }}
					}
				}
				else {
					var temprequired = (Number(value)+Number(gasPrice));
					temprequired = temprequired / 100000000;
					balance = balance / 100000000;
					return errors = { error:{
						code : 2010,
						message :`Not enough balance in ${from} available ${balance}, but needed is ${temprequired} (including fee)`
					 }}
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
			return response.status(400).json({
			 meta : errors	,
			 source : 'offical'
			});
		}else{
			return response.status(200).json({
			 payload:finalResponse,
			 source : 'offical'
			});
		}
	
			
	}
});

function walletbroadcast(txdata) {
	var data;
	var response = "";
	return new Promise(function(resolve, reject) {
		insight.broadcast(txdata, function(err, returnedTxId) {
			  if (err) {
				  response = err;
			  } else {
				  data = returnedTxId
				// Mark the transaction as broadcasted
			  }
			  var obj = {
				response:  response,
				data: data
			};
			resolve(obj)
		})
	});
}

// router.get('/getBalance/:walletAddress', async function (request, response) {
	// var code = 200;
	// var message = ``;
	// var transactions = '';
	// var ResponseData = null;
	// var finalResponse = null;
	// let errors = null;
	// let checksum_address = null;
	
	// try {
		// console.log(request.params.walletAddress.length)
		// if(request.params) {
			// if (!request.params.walletAddress) {
				// return errors = { error:{
					 // code : 17,
					 // message :`Required request body is missing`,
				  // }}
			   
			 // } 
			 // else if (request.params.walletAddress.length < 30 || request.params.walletAddress.length > 34) {
				 // return errors = { error:{
					// code : 3000,
					// message : request.params.walletAddress+ ` is not a valid Litecoin address`,
				 // }}
			 // }
			// else {
				// let walletAddress = request.params.walletAddress;
				
				// var walletdetails = null;
				// var date = new Date();
				// var timestamp = date.getTime();
				// let sent = 0;
				// let received = 0;
				
				// await axios.get(
					// `https://api.blockcypher.com/v1/ltc/main/addrs/${request.params.walletAddress}`
				// ).then(res => {
					// let transactions = res.data;
					// walletdetails = transactions;
					// if(transactions.n_tx > 0) {
						// for (let i = 0; i < transactions.txrefs.length; i++) {
							// if(transactions.txrefs[i].tx_input_n == -1) {
								// received += 1;
							// } else { 
								// sent += 1;
							// }
						// }
					// }
				// });

				// ResponseData = {
					// payload: {
						// address: walletAddress,
						// totalSpent : walletdetails.total_sent / 100000000,
						// totalReceived : walletdetails.total_received / 100000000,
						// balance : walletdetails.balance / 100000000,
						// txi : received,
						// txo : sent, 
						// txsCount : walletdetails.n_tx, 
						// addresses : [
							// walletAddress
						// ]
					// },
					// message: "",
					// status: 200,
					// success: true
				// };
				// message = "Completed";
				// code = 200;
				// finalResponse = ResponseData.payload;
			// }
		// } else {
			// message = "Transaction cannot proceeds as request params is empty";
			// code = 204;
		// }
	// } catch (error) {
		// return errors = { error: {
            // code : 1,
            // message :`General error: ${error}`,
         // }};
	// } finally {
		// if (finalResponse==null) {	
			// return response.status(200).json({
			 // meta: errors
			
			// });
		// } else {
			// return response.status(200).json({
				// payload:finalResponse,
			// });
		// }
	// }
	
	
// });

module.exports = router;