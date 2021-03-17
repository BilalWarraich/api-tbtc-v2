//This module help to listen request
var express = require('express');
var router = express.Router();
const axios = require('axios');
let coinSelect = require('coinselect')
const crypto = require('crypto');
const EC = require('elliptic').ec;
const RIPEMD160 = require('ripemd160');
const bs58 = require('bs58');
const buffer = require('buffer');
const ec = new EC('secp256k1');
var bitcore = require('bitcore-lib');

var Insight = require('bitcore-explorers').Insight;
var insight = new Insight('mainnet');
let bech32 = require('bech32')

//-----------------------------Get Transactions of Account----------------------------------------------
router.get('/track/:hash', async function (request, response) {
	var ResponseCode = 200;
	var ResponseMessage = ``;
	var ResponseData = null;
	var finalResponse = null;
	try {
		if(request.params) {
			if (!request.params.hash) {
				ResponseMessage = "hash is missing \n";
				ResponseCode = 206;
			} else {
				let hash = request.params.hash;
				if (hash.length == 64) {
					var xmlHttp = new XMLHttpRequest();
					xmlHttp.open( "GET", 'https://insight.bitpay.com/api/tx/' + hash, false ); // false for synchronous request
					xmlHttp.send();

					var transactions = JSON.parse(xmlHttp.responseText);
			         ResponseData = {
						     
							 txid: transactions.txid,
							 size: transactions.size,
							 time: transactions.time,
							 blockhash: transactions.blockhash,
							 blockheight: transactions.blockheight,
							 blocktime: transactions.blocktime,
							 confirmations: transactions.confirmations,
							 txins :
							         transactions.vin.map((item)=>{
								      return {txout: item.txid.toString(), vout: item.vout.toString(), amount: item.value.toString(), addresses : item.addr, script : item["scriptSig"]   }
							          }),
							 txouts :
							         transactions.vout.map(item=> {
									   return{  amount:item.value,type:item.scriptPubKey["type"] ,addresses:item.scriptPubKey["addresses"],script:[{asm:item.scriptPubKey["asm"],hex:item.scriptPubKey["hex"]}]}
                                        }),
					};
					finalResponse =ResponseData;
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
        if (finalResponse==null){	
			return response.status(400).json({
			 meta : errors	
			});
		}else{
			return response.status(200).json({
			 payload:finalResponse,
			});
		}
		
		}
});

//-----------------------------Send Btc from 1 account to the others----------------------------------------------
router.post('/transfer', async function (request, response) {
	
	var ResponseCode = 200;
	var ResponseMessage = ``;
	var ResponseData = null;
	var finalResponse = null;
    let errors = null;

	try {
		if(request.body) {
			var ValidationCheck = true;
			if (!request.body.createTx.inputs[0].address) {
				ValidationCheck = false;
				return errors = { error:{
					code : 2201,
					message :`from' address must not be empty`,
				 }}
			}
			if (!request.body.createTx.outputs[0].address) {
				ValidationCheck = false;
				return errors = { error:{
					code : 2204,
					message :`to' address must not be empty`,
				 }}
			}
			if (!request.body.wifs[0]) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3006,
					message :`privateKey cannot be null or empty`,
				 }}
			}
			if (!request.body.createTx.inputs[0].value) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3001,
					message :`Value is not provided`,
				 }}
			} else if (!request.body.createTx.inputs[0].value === parseInt(request.body.createTx.inputs[0].value)) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3011,
					message :`BigInt or BigDecimal conversion error`,
				 }}
			}
		
			if(ValidationCheck == true) {
			    var fromAddress = request.body.createTx.inputs[0].address;
				var value = parseFloat(request.body.createTx.inputs[0].value);
				var toAddress = request.body.createTx.outputs[0].address;
				var toValue =  request.body.createTx.outputs[0].value;
				var feesAddress = request.body.createTx.fee.address;
				var feeValue = parseFloat(request.body.createTx.fee.value);
				var fromPrivateKey =  request.body.wifs[0];
				
				value = Math.round((value * 100000000));
				feeValue = Math.round((feeValue * 100000000));
				
				// if (value < 1000) { 
					// return errors = { error:{
					// code : 400,
						// message : 'Value should be greater than or equals to 1000 because gas fee is 50000'
					 // }}
				// }
				// console.log('out')
			   // if(value != toValue){
				// return errors = { error:{
					// code : 2206,
					// message :`Conflict in the value to be send`,
				 // }}
				// }
				if(fromAddress != feesAddress){
					return errors = { error:{
						code : 2206,
						message :`Trying to deduct fees from another address`,
					 }}
				}
				// if (toAddress.length < 34 || toAddress.length > 34) {
					// return errors = { error:{
						// code : 2206,
						// message :`to' address is not valid`,
					 // }}
					
				// }
				// if (fromAddress.length < 34 || fromAddress.length > 34) {
					// return errors = { error:{
						// code : 2203,
						// message :`from' address is not valid`,
					 // }}
					
				// }
				let privateKey;
				try {
					privateKey = bitcore.PrivateKey.fromWIF(fromPrivateKey);
				} catch (error) {
					return errors = { error:{
						code : 400,
						message :`private key is invalid : ${error}`,
					 }}
					
				}
				
				let _fromAddress = privateKey.toAddress();
				
			    var balanceObj = await getwalletbalance(_fromAddress);
				
				if(balanceObj.response == '') {
					let balance = parseInt(balanceObj.balance);
					let gasfee = feeValue;
					
					if(balance >= parseInt(value+gasfee)) {
						var unspentObj = await getwalletnspent(_fromAddress);
						
						if(unspentObj.response == '') { 
						
							var tx = bitcore.Transaction();
							tx.from(unspentObj.data);
							tx.to(toAddress, value);
							tx.change(_fromAddress);
							tx.fee(feeValue);
							tx.sign(privateKey);
							tx.serialize();
							
							
							console.log(tx)
							var broadcastObj = await walletbroadcast(tx);
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
									message :`Can not send transaction`,
								 }}
							}
						} else {
							//console.log("transfer btc6");

							return errors = { error:{
								code : 2003,
								message :`Can not create transaction`,
							 }}
						
						}
					} else {
						var temprequired = value+gasfee;
						temprequired = temprequired / 100000000;
						balance = balance / 100000000;
						return errors = { error:{
							code : 2010,
							message :`Not enough balance in ${_fromAddress} available ${balance}, but needed is ${temprequired} (including fee)`,
						 }}
						
					}
				} else {
					return errors = { error:{
						code : 400,
						message : balanceObj.response 
					 }}
				}
				
			} else {
				return errors = { error:{
					code : 400
				 }}
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
	} finally {
		if (finalResponse==null){	
			return response.status(400).json({
			 meta : errors,
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

//-----------------------------Get Balance of Account----------------------------------------------
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
					message : request.params.walletAddress+ ` is not a valid bitcoin address`,
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
					// `https://insight.bitpay.com/api/txs/?address=${request.params.walletAddress}`
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
			      // `https://insight.bitpay.com/api/txs/?address=${request.params.walletAddress}&pageNum=${cnt}`
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
				// }})
		
	           // }
	           // }

				


				await axios.get(
					`https://insight.bitpay.com/api/addr/${request.params.walletAddress}/?noTxList=1`
				    ).then(res => {
					
					let transactions = res.data;
				
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

// ---------------------------- Custom function ----------------------------------------
function hasha256(data) {
	return crypto.createHash('sha256').update(data).digest();
} // A small function I created as there is a lot of sha256 hashing.

function getwalletbalance(_fromAddress) {
	var balance;
	var response = "";
	
	return new Promise(function(resolve, reject) {
		insight.address(_fromAddress, function (err, res) {
			
			if (err) {
				response = `Wallet Address ${_fromAddress} not found. Search Stop on error : ${err}`;
			} else {
				response = '';
				balance = res.balance;
			} 
			var obj = {
				response:  response,
				balance: balance
			};
			resolve(obj);
		});
	});
}

function getwalletnspent(_fromAddress) {
	var data;
	var response = "";
	return new Promise(function(resolve, reject) {
		insight.getUnspentUtxos(_fromAddress, function (error, utxos) {
			if (error) {
				response = `Transaction signing stops with the error ${error}`;
			} else {
				data = utxos;
			} 
			var obj = {
				response:  response,
				data: data
			};
			resolve(obj)
		});
	});
}

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




router.post('/getFees', async function (request, response) {
	var finalResponse = null;
	let errors = null;

	try {
		if (request.body) {
			var ValidationCheck = true;
			if (!request.body.address) {
				ValidationCheck = false;
				return errors = {
					error: {
						code: 2201,
						message: `Address cannot be null or empty`,
					}
				}
			}
			// if (!request.body.mode) {
			// 	ValidationCheck = false;
			// 	return errors = {
			// 		error: {
			// 			code: 2201,
			// 			message: `Mode of txn cannot be null or empty`,
			// 		}
			// 	}
			// }
			if (ValidationCheck == true) {
				var Address = request.body.address;
				if (!request.body.mode) {
					var mode = "fastest"
				} else {
					var mode = request.body.mode;
				}
				if (Address.length < 34 || Address.length > 34) {
					return errors = {
						error: {
							code: 2203,
							message: `address is not valid`,
						}
					}

				}

				var unspentObj = await getwalletnspent(Address);


				let targets = [
					{
						address: Address,
					}
				]

				await axios.get(
					` https://bitcoinfees.earn.com/api/v1/fees/recommended`
				).then(async function (feeRate) {
					feeRate.data='';
					let feeRate2 = '';
					if (feeRate.data == '') {
						await axios.get(
							`https://api.blockchain.info/mempool/fees`
						).then(async function (res) {
							feeRate2 = {
								data: {
									fastestFee: Number(res.data.priority),
									halfHourFee: Number(res.data.priority),
									hourFee: res.data.regular
								}
							}

						})


					}


					var utxos = [];

					var i = 0;
					while (i < Object.values(unspentObj.data).length) {
						var hash = Object.values(Object.values(unspentObj.data)[i])[1];
						var hashVal = Object.values(Object.values(unspentObj.data)[i])[2]
						var satoshiVal = Object.values(Object.values(unspentObj.data)[i])[4]

						let obj = {
							[hash]: hashVal,
							"satoshis": satoshiVal
						}
						utxos.push(obj)

						i++;
					}
					let finalFees = "";
					if (feeRate.data != '') {
						console.log('--------------------------------->>>>');
						console.log("opt1", feeRate.data)
						console.log('--------------------------------->>>>');
						finalFees = feeRate;
					} else {
						console.log('--------------------------------->>>>');
						console.log("opt2", feeRate2.data)
						console.log('--------------------------------->>>>');
						finalFees = feeRate2;
					}


					if (mode == "slowest") {
						let { fee } = coinSelect(utxos, targets, finalFees.data.hourFee)
						finalResponse = {
							btc: fee * 0.00000001,
							satoshi: fee

						};
					} else if (mode == "average") {
						let { fee } = coinSelect(utxos, targets, finalFees.data.halfHourFee)
						finalResponse = {
							btc: fee * 0.00000001,
							satoshi: fee

						};
					} else if (mode == "fastest") {
						let { fee } = coinSelect(utxos, targets, finalFees.data.fastestFee)
						finalResponse = {
							btc: fee * 0.00000001,
							satoshi: fee

						};
					} else {
						return errors = {
							error: {
								code: 17,
								message: `Mode must be "fastest" or "average" or "slowest"`,
							}
						}
					}
				})

			} else {
				return errors = {
					error: {
						code: 400
					}
				}
			}
		} else {
			return errors = {
				error: {
					code: 17,
					message: `Required request body is missing`,
				}
			}
		}
	} catch (error) {
		errors = {
			error: {
				code: 1,
				message: `General error:  ${error}`,
			}
		}
	} finally {
		if (finalResponse == null) {
			return response.status(400).json({
				meta: errors,
				source: 'offical'
			});
		} else {
			return response.status(200).json({
				fees: finalResponse,
				source: 'offical'
			});
		}
	}


})











router.post('/multi-transfer', async function (request, response) {

	var ResponseData = null;
	var finalResponse = null;
	let errors = null;

	try {
		if (request.body) {
			var ValidationCheck = true;
			if (!request.body.createTx.inputs[0].address) {
				ValidationCheck = false;
				return errors = {
					error: {
						code: 2201,
						message: `from' address must not be empty`,
					}
				}
			}
			if (!request.body.createTx.outputs.length > 0) {
				ValidationCheck = false;
				return errors = {
					error: {
						code: 2204,
						message: `to' addresses must not be empty`,
					}
				}
			}
			if (!request.body.wifs[0]) {
				ValidationCheck = false;
				return errors = {
					error: {
						code: 3006,
						message: `privateKey cannot be null or empty`,
					}
				}
			}
			request.body.createTx.outputs.map(item => {
				if (!item.address === parseInt(item.address)) {
					ValidationCheck = false;
					return errors = {
						error: {
							code: 3011,
							message: `to' address must not be empty`,
						}
					}
				}
				if (!item.value === parseInt(item.value)) {
					ValidationCheck = false;
					return errors = {
						error: {
							code: 3011,
							message: `BigInt or BigDecimal conversion error`,
						}
					}
				}
			})

			if (ValidationCheck == true) {


				var fromAddress = request.body.createTx.inputs[0].address;
				var value = parseFloat(request.body.createTx.inputs[0].value);
				var feesAddress = request.body.createTx.fee.address;
				var feeValue = parseFloat(request.body.createTx.fee.value);
				var fromPrivateKey = request.body.wifs[0];

				value = Math.round((value * 100000000));
				feeValue = Math.round((feeValue * 100000000));


				if (fromAddress != feesAddress) {
					return errors = {
						error: {
							code: 2206,
							message: `Trying to deduct fees from another address`,
						}
					}
				}

				if (fromAddress.length < 34 || fromAddress.length > 34) {
					return errors = {
						error: {
							code: 2203,
							message: `from' address is not valid`,
						}
					}

				}
				let privateKey;
				try {
					privateKey = bitcore.PrivateKey.fromWIF(fromPrivateKey);
				} catch (error) {
					return errors = {
						error: {
							code: 400,
							message: `private key is invalid : ${error}`,
						}
					}

				}

				let _fromAddress = privateKey.toAddress();

				var balanceObj = await getwalletbalance(_fromAddress);
				var outputs = [];
				var PrincpleFee = 0;

				request.body.createTx.outputs.map(item => {
					if (item.address.length < 34 || item.address.length > 34) {
						return errors = {
							error: {
								code: 2206,
								message: `to' address is not valid`,
							}
						}

					}

					if (item.value == '') {
						return errors = {
							error: {
								code: 2206,
								message: `to' value must not be empty`,
							}
						}

					}
					let obj = {
						address: item.address,
						satoshis: item.value * 100000000
					}
					PrincpleFee += item.value * 100000000;
					outputs.push(obj)
				})
// console.log("PrincpleFee",PrincpleFee)
// console.log("outputs",outputs)
// return;
				if (balanceObj.response == '') {
					let balance = parseInt(balanceObj.balance);
					let gasfee = feeValue;

					if (balance >= parseInt(PrincpleFee + gasfee)) {
						var unspentObj = await getwalletnspent(_fromAddress);
						if (unspentObj.response == '') {
							var tx = bitcore.Transaction();
							tx.from(unspentObj.data);
							tx.to(outputs);
							tx.change(_fromAddress);
							tx.fee(feeValue);
							tx.sign(privateKey);
							tx.serialize();
							var broadcastObj = await walletbroadcast(tx);
							if (broadcastObj.response == '') {
								ResponseMessage = "Transaction successfully completed";
								ResponseCode = 200;
								ResponseData = {
									txid: broadcastObj.data
								}
								finalResponse = ResponseData;

							} else {
								return errors = {
									error: {
										code: 2003,
										message: `Can not send transaction`,
									}
								}
							}
						} else {

							return errors = {
								error: {
									code: 2003,
									message: `Can not create transaction`,
								}
							}

						}
					} else {
						var temprequired = value + gasfee;
						temprequired = temprequired / 100000000;
						balance = balance / 100000000;
						return errors = {
							error: {
								code: 2010,
								message: `Not enough balance in ${_fromAddress} available ${balance}, but needed is ${temprequired} (including fee)`,
							}
						}

					}
				} else {
					return errors = {
						error: {
							code: 400,
							message: balanceObj.response
						}
					}
				}

			} else {
				return errors = {
					error: {
						code: 400
					}
				}
			}
		} else {
			return errors = {
				error: {
					code: 17,
					message: `Required request body is missing`,
				}
			}
		}

	} catch (error) {
		errors = {
			error: {
				code: 1,
				message: `General error:  ${error}`,
			}
		}
	} finally {
		if (finalResponse == null) {
			return response.status(400).json({
				meta: errors,
				source: 'offical'
			});
		} else {
			return response.status(200).json({
				payload: finalResponse,
				source: 'offical'
			});
		}
	}

});

module.exports = router;
