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
	 "https://mainnet.infura.io/v3/8dd6b87d45bd4bf6ae60447551c3a895"
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


function toChecksum(address)
{
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
				console.log("confirm_count:",confirm_count)
				console.log("pending_count:", Number(pending_count) - Number(confirm_count))
				
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
		 msg:message	
		});
    }else{
		return response.status(200).json({
		 payload:finalResponse,
		});
	}

		
	}

});



//-----------------------------Get Balance of Account----------------------------------------------

router.get("/getBalance/:walletAddress", async function (request, response) {
    var code = 200;
	var message = ``;
	var transactions = '';
	var ResponseData = null;
	var finalResponse = null;
	let errors = null;
	try {
		if(request.params) {
			if (!request.params.walletAddress) {
				return errors = { error:{
					 code : 17,
					 message :`Required request body is missing`,
				  }}
			   
			 } 
		   
			 else if(web3._extend.utils.isChecksumAddress(request.params.walletAddress)==false)    //Added by Aqeel
			 {     
				 return errors = { error:{
					 code : 3000,
					 message : request.params.walletAddress+ ` is not a valid Ethereum address`,
				  }}
			 }
			else {
				let walletAddress = request.params.walletAddress;

			
				const balance =  web3.eth.getBalance(walletAddress);
				const weiBalance = web3.fromWei(balance.toNumber(), "ether");
	
				let sent = 0;
				let received = 0;

				transactions = await axios.get(
					"http://api.etherscan.io/api?module=account&action=txlist&address=" + walletAddress + "&startblock=0&endblock=99999999&sort=asc"
				).then(transactions =>{
				    var txn = transactions.data;
					for (let i = 0; i < txn.result.length; i++) {
					    String( txn.result[i].from)
						.toUpperCase()
						.localeCompare(String(walletAddress).toUpperCase()) == 0 ?
						(sent += 1) :
						String( txn.result[i].to)
						.toUpperCase()
						.localeCompare(String(walletAddress).toUpperCase()) == 0 ?
						(received += 1) :
						"";
				   }   
			    })
					

				ResponseData = {
				              	payload: {
												chain: "ETH.mainnet",
												address: walletAddress,
											    balance: Number(weiBalance).toFixed(13),
												txs_count: Number(sent) + Number(received),
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
		return response.status(200).json({
	     meta: errors
		
		});
    }else{
		return response.status(200).json({
			payload:finalResponse,
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
	
	try {
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
				} else if (web3._extend.utils.isChecksumAddress(fromAddress)==false  ){    //Added by Aqeel
					return errors = { error:{
						code : 3000,
						message : fromAddress+ ` is not a valid Ethereum address`,
					 }}
				
				} else if( web3._extend.utils.isChecksumAddress(toAddress)==false){
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



function getTransaction(hash) {
   var data;
	return new Promise(function(resolve, reject) {
		web3.eth.getTransaction(hash, function (err, transaction) {
			console.log("txn:",transaction)
		    var date = new Date();
			var timestamp = date.getTime();
			var conf = web3.eth.getBlock("latest").number - transaction.blockNumber ;
			data = {
				transaction: {
					hash: transaction.hash,
					currency: "ETH",
					from: transaction.from,
					to: transaction.to,
					amount: transaction.value / 10 ** 18,
					fee: transaction.gasPrice,
					n_confirmation :  conf,
					block: transaction.blockNumber,
					link: `https://www.etherchain.org/tx/${hash}`
				},
				message: "",
				timestamp: timestamp,
				status: 200,
				success: true
			};
			resolve(data);
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
	try {
		if(request.params) {
			if (!request.params.hash) {
				message = "hash / wallet address is missing \n";
				code = 206;
			} else {
				let hash = request.params.hash;
				if (hash.length == 66) {
					ResponseData = await getTransaction(hash);
					message = "Completed";
					code = 200;
                    } else if (hash.length == 42) {
					var xmlHttp = new XMLHttpRequest();
					xmlHttp.open( "GET", 'http://api-rinkeby.etherscan.io/api?module=account&action=txlist&address=' + hash + '&startblock=0&endblock=99999999&sort=asc&limit=100', false ); // false for synchronous request
					xmlHttp.send();
					var transactions = JSON.parse(xmlHttp.responseText);
					for (let i = 0; i < transactions.result.length; i++) {
						transactions.result[i].value = transactions.result[i].value / 10 ** 18;
					}
					ResponseData = {
						transaction: transactions.result
					};
					message = "Completed";
					code = 200;
				} else {
					message = "Invalid Hash or Wallet Address"
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
		return response.status(200).json({
			code : code,
			data : ResponseData,
			msg : message
		});
	}
    

});

module.exports = router;