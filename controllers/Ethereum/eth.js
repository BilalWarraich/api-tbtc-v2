//This module help to listen request
var express = require("express");
var router = express.Router();
const axios = require("axios");
const Web3 = require("web3");
const web3 = new Web3();
const Tx = require("ethereumjs-tx");
const rateLimit = require("express-rate-limit");
const Web3EthAccounts = require('web3-eth-accounts');
const Wallet = require('ethereumjs-wallet')
 

var sendTransactionLimiter = rateLimit({
	windowMs:  24* 60 * 60 * 1000, // 24 hours
	max: 100000,
	message:
	  "Your limit has been reached!"
  })

web3.setProvider(
    new web3.providers.HttpProvider(
	//    "https://rinkeby.infura.io/t2utzUdkSyp5DgSxasQX"
	 "https://mainnet.infura.io/v3/f94bc58a280645dba2eff3e86a959b10"
	 // "https://ropsten.infura.io/v3/b56b5cd8cb9c4ae3a91fedfeabcd4957"
    )
);

function getNetwork(){
	var netId = web3.version.network;
	switch (netId) {
		case "1":
			return'mainnet';
		  break
		case "2":
			return'Morden';
		  break
		case "3":
			return'rinkeby';
		  break
		default:
			return'unknown';
	  }
}

function toChecksum(address) {
	return web3._extend.utils.toChecksumAddress(address)
}

router.get("/getCurrentNounce/:walletAddress", async function (request, response) {
	var code = 200;
	var message = ``;
	var ResponseData = null;
	var finalResponse = null;
	try {
		if(request.params) {
			if (!request.params.walletAddress) {
				message = "wallet address is missing \n";
				code = 206;
			} 
			else if(web3._extend.utils.toChecksumAddress(request.params.walletAddress)==false)    //Added by Aqeel
			{
				message =  "Checksum Failed. Invalid Address"
				code = 400;
				return;
			}
			else {
				let walletAddress = request.params.walletAddress;

				if (walletAddress.length < 42) {
						message =  "Invalid Wallet Address"
						code = 400;
						return;
				}
				let confirm_count = await web3.eth.getTransactionCount(walletAddress);
				let pending_count = await web3.eth.getTransactionCount(walletAddress, 'pending');
			//	console.log("confirm_count:",confirm_count)
			//	console.log("pending_count:", Number(pending_count) - Number(confirm_count))
				
							ResponseData = {
				              	payload: {
										confirm : confirm_count,
										pending : Number(pending_count) - Number(confirm_count)
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
		message = `Transaction signing stops with the error ${error}`;
		code = 400;
	} finally {

    if (finalResponse==null){	
		return response.status(200).json({
	     payload:finalResponse,
		 msg:message,
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
router.get("/getBalance/:walletAddress", async function (request, response) {
	// web3.setProvider(
    // new web3.providers.HttpProvider(
	// //    "https://rinkeby.infura.io/t2utzUdkSyp5DgSxasQX"
	 // "https://mainnet.infura.io/v3/8dd6b87d45bd4bf6ae60447551c3a895"
	 // // "https://ropsten.infura.io/v3/b56b5cd8cb9c4ae3a91fedfeabcd4957"
    // )
// );

    var code = 200;
	var message = ``;
	var transactions = '';
	var ResponseData = null;
	var finalResponse = null;
	let errors = null;
	let checksum_address = null;
	let balance = null;
	
	
	try {
		 if (request.params.walletAddress.length < 42) {
			return errors = { error:{
					code : 3000,
					message : request.params.walletAddress+ ` is not a valid Ethereum address`,
				}
			}
		} else {
			checksum_address =  web3._extend.utils.toChecksumAddress(request.params.walletAddress);
	    }
		
		
		
		if(request.params) {
			if (!request.params.walletAddress) {
				return errors = { error:{
					 code : 17,
					 message :`Required request body is missing`,
				  }}
			   
			 } 
		   
			  else if(web3._extend.utils.isChecksumAddress(checksum_address)==false)    //Added by Aqeel
			  {     
				  return errors = { error:{
					  code : 3000,
					  message : request.params.walletAddress+ ` is not a valid Ethereum address`,
				   }}
			  }
			else {
				let walletAddress = request.params.walletAddress;

			
			//	const balance =  web3.eth.getBalance(walletAddress);
			//	balance = 
				//const weiBalance = web3.fromWei(balance.toNumber(), "ether");
				//let confirm_count = await web3.eth.getTransactionCount(walletAddress);
				//let pending_count = await web3.eth.getTransactionCount(walletAddress, 'pending');
	
				let sent = 0;
				let received = 0;

				// transactions = await axios.get(
					// "http://api.etherscan.io/api?module=account&action=txlist&address=" + walletAddress + "&startblock=0&endblock=99999999&sort=asc"
				// ).then(transactions =>{
					// console.log(typeof(transactions.data.result))

                    // var flags = [], output = [], l = transactions.data.result.length, i;
                   // for( i=0; i<l; i++) {
                    // if( flags[transactions.data.result[i].hash]) continue;
                    // flags[transactions.data.result[i].hash] = true;
                    // output.push(transactions.data.result[i]);
                     // }
					
			
					// var txn = output;
					
					// for (let i = 0; i < txn.length; i++) {
						// String( txn[i].from)
						// .toUpperCase()
						// .localeCompare(String(walletAddress).toUpperCase()) == 0 ?
						// (sent += 1) :
						// String( txn[i].to)
						// .toUpperCase()
						// .localeCompare(String(walletAddress).toUpperCase()) == 0 ?
						// (received += 1) :
						// "";
				   // }   
			    // })
					await axios.post('https://mainnet.infura.io/v3/8dd6b87d45bd4bf6ae60447551c3a895', {"jsonrpc":"3.0","method":"eth_getBalance","params": [request.params.walletAddress, "latest"],"id":1})
						.then(function(response){
							balance =  parseInt(response.data.result);
						
					});  

				ResponseData = {
				              	payload: {
												chain: "ETH.mainnet",
												address: walletAddress,
											   // balance: Number(weiBalance).toFixed(18),
											   balance : ((balance) / (1000000000000000000)).toFixed(18),
												// txs_count: Number(sent) + Number(received),
												//txs_count : Number(confirm_count),
												from: sent,
												to: received
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
		return errors = { error:{
            code : 1,
            message :`General error: ${error}`,
         }}
	} finally {

    if (finalResponse==null){	
		return response.status(400).json({
	     meta: errors,
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

// //----------------------------------Send Ethers----------------------------------------------
router.post("/transfer",sendTransactionLimiter, async function (request, response) {
	
	var code = 200;
	var message = ``;
	var ResponseData = null;
	var finalResponse = null;
    let errors = null;
	 let checksum_address_from = null;
	 let checksum_address_to = null;
	
	
	try {
		 if (request.body.fromAddress.length < 42 && request.body.toAddress.length < 42) {
			 //console.log("legth invalid")
                     return errors = { error:{
						 code : 3000,
						 message : `Not a valid Ethereum address`,
					  }}
                 }
	     else{
		  checksum_address_from =  web3._extend.utils.toChecksumAddress(request.body.fromAddress);
		  checksum_address_to =  web3._extend.utils.toChecksumAddress(request.body.toAddress);
		 // console.log(checksum_address_from)
		 // console.log(checksum_address_to)
	     }
		if(request.body) {
			
			var ValidationCheck = true;
			if (!request.body.fromAddress) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3004,
					message :`fromAddress cannot be null or empty`,
				 }}
			
			}
			if (!request.body.toAddress) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3005,
					message :`toAddress cannot be null or empty`,
				 }}
			}
			if (!request.body.privateKey) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3006,
					message :`privateKey cannot be null or empty`,
				 }}
			}
			if (!request.body.value) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3001,
					message :`Value is not provided`,
				 }}
			} 
			if (!request.body.gasPrice) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3019,
					message :`Could not estimate gas price`,
				 }}
			} 
			if (!request.body.gasLimit) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3020,
					message :`Could not estimate gas limit`,
				 }}
			} 
		
			else if (!request.body.value === parseInt(request.body.value)) {
				ValidationCheck = false;
				return errors = { error:{
					code : 3011,
					message :`BigInt or BigDecimal conversion error`,
				 }}
			}
			
			if(ValidationCheck == true) {
				
				let fromAddress = request.body.fromAddress;
				let privateKey = request.body.privateKey;
				let toAddress = request.body.toAddress;
				let etherValue = request.body.value;
				let gasPrice = request.body.gasPrice;
				let gasLimit = request.body.gasLimit;
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
				 else if(Number( weiBalance) <= Number(etherValue)){
					return errors = { error:{
						code : 3023,
						message : `Balance is not enough`,
					 }}
				 }
				 else if (toChecksum('0x'+Wallet.fromPrivateKey(Buffer.from(privateKey, 'hex')).getAddress().toString('hex')).toLowerCase() != fromAddress.toLowerCase()){
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

function getTransaction(hash) {
   var ResponseData;
	return new Promise(function(resolve, reject) {
		web3.eth.getTransaction(hash, function (err, transaction) {
			console.log("txn:",transaction)
		    var date = new Date();
			var timestamp = date.getTime();
			var conf = web3.eth.getBlock("latest").number - transaction.blockNumber ;
			ResponseData={
					chain: "ETH.mainnet",
					from: transaction.from,
					to: transaction.to,
					value: transaction.value / 10 ** 18,
					gas_price: transaction.gasPrice,
					hash: transaction.hash,
					confirmations :  conf
				
			};
			resolve(ResponseData);
		})
	});
}

function getgasprice() {
	var gasprice;
	var response = "";
	return new Promise(function(resolve, reject) {
		web3.eth.getGasPrice(function (err, gsPrice) {
			if (err) {
				response = `Gas Bad Request ${err}`;
			} else {
				gasprice = gsPrice;
			} 
			var obj = {
				response:  response,
				gasprice: gasprice
			};
			resolve(obj);
		});
	});
}

function sendrawtransaction(serializedTx) {
	var hash;
	var response = "";
	return new Promise(function(resolve, reject) {
		web3.eth.sendRawTransaction("0x" + serializedTx.toString("hex"), function ( err, hsh ) {
			if (err) {
				response =  { error:{
					code : 1,
					message : `General error: ${err}`,
				 }} ;
			} else {
				hash = hsh;
			} 
			var obj = {
				response:  response,
				hash: hash
			};
			resolve(obj);
		});
	});
}

//-----------------------------Get Transaction----------------------------------------------
router.get("/track/:hash", async function (request, response) {
	var code = 200;
	var message = ``;
	var ResponseData = null;
	var finalResponse = null;
	try {
		if(request.params) {
			if (!request.params.hash) {
				message = "hash is missing \n";
				code = 206;
			} else {
				let hash = request.params.hash;
				if (hash.length == 66) {
					finalResponse = await getTransaction(hash);
					message = "Completed";
					code = 200;
                    }  else {
					message = "Invalid Hash"
					code = 400;
				}
			}
		} else {
			message = "Transaction cannot proceeds as request params is empty";
			code = 204;
		}
	} catch (error) {
		message = `Transaction signing stops with the error ${error}`;
		code = 400;
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
	
module.exports = router;
