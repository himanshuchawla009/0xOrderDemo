const express = require('express');
const {
    assetDataUtils,
    BigNumber,
    ContractWrappers,
    generatePseudoRandomSalt,
    Order,
    orderHashUtils,
    signatureUtils,
  } =  require('0x.js');
  const { RPCSubprovider, Web3ProviderEngine } = require('0x.js');

  const { Web3Wrapper } = require ('@0x/web3-wrapper');
  const providerEngine = new Web3ProviderEngine();
 
const solc = require("solc");
require('dotenv').config();
const ethers = require("ethers");
const erc20 = require('./contracts/Erc20').erc20;
const erc20A = require('./contracts/erc20A').erc20;
const assetProxy = require('./contracts/AssetProxy').assetProxy;
const  { abi, byteCode } = require('./contracts/Exchange');
const app = express();
const fs= require('fs') 
const bigNumber = require('big-number');
const DECIMALS = 18;
const tokenB = "0xCDcD896C0C47158dbCfDc72Be8A11b020c1C0CcC";
const tokenA = "0x49e2C152064d73B2399b43b43a1e9F5d5DFc7D7E";
const assetProxyAddress = "0xC021c58560721Ff9242B7F327A2de589a43870D4";
const exchangeContract ="0x8eddd41265bb50dbef51bc8efda5e2744fc39e53"
const makerKey = process.env.makerKey; //holds token A
const takerKey = process.env.takerKey; //holds token B
const makerAddress = "0x005B385aD1307e4064cf15aec39C12568eB37A86";
const takerAddress = "0xa4ea7196BCf69a8DB38758b5DE395D3f01F23e6E";
const makerAssetData = assetDataUtils.encodeERC20AssetData(tokenA);
const takerAssetData = assetDataUtils.encodeERC20AssetData(tokenB);
const makerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(1), DECIMALS);
const takerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(2), DECIMALS);

const { addNewNetwork } = require('@0x/contract-addresses/lib/src');
const { PrivateKeyWalletSubprovider } = require('@0x/subproviders') ;
const makerKeyWallet = new PrivateKeyWalletSubprovider(makerKey);

const takerKeyWallet = new PrivateKeyWalletSubprovider(takerKey);

  const TX_DEFAULTS = { gas: 4000000 };  


  const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
  const ZERO = new BigNumber(0);
  const ONE_SECOND_MS = 1000;
  // tslint:disable-next-line:custom-no-magic-numbers
   const ONE_MINUTE_MS = ONE_SECOND_MS * 60;
  // tslint:disable-next-line:custom-no-magic-numbers
   const TEN_MINUTES_MS = ONE_MINUTE_MS * 10;




const compileContract = async (contract) => {

    return new Promise(async (resolve, reject) => {
    try{
        const contractObject = await solc.compile(contract,1);
        if(!contractObject.errors)
        {
            resolve(contractObject);
        }
        else
        {
            reject(contractObject.errors);
        }
    }
    catch(err)
    {
        reject(err);
    }
    });   
}

const deployContract = async (abi,byteCode)=> {
    try {
       
        return new Promise(async (resolve,reject)=>{    
            let defaultProvider = ethers.getDefaultProvider('rinkeby');
            let walletWithProvider = new ethers.Wallet(process.env,privateKey, defaultProvider);
            let factory = new ethers.ContractFactory(abi, byteCode, walletWithProvider);
            let contract = await factory.deploy();
            console.log(contract.deployTransaction.hash,"contract");
            let deployedContract = await defaultProvider.waitForTransaction(contract.deployTransaction.hash);
            resolve(deployedContract)  
                       
         })
     } catch (error) {
         throw error
     }
  }


  app.get('/erc20',async (req,res,next)=>{
     try {
         let isCompiled = await compileContract(erc20);
         if (!!isCompiled) {
            console.log("Successfully Compiled!");
            const abi = isCompiled.contracts[":TokenB"].interface;
            const bytecode = "0x" + isCompiled.contracts[":TokenB"].bytecode;
            console.log('bytecode',bytecode)
            let deployedContract = await deployContract(abi,bytecode);
            res.status(200).json({
                "contract":deployedContract
            })
         } else {
             res.send("Not able to compile contract")
         }
     } catch (error) {
         res.status(401).json({
             "error":error
         })
     }
  })
  
  app.get('/exchange',async (req,res,next)=>{
    
        
      try {
        let deployedContract = await deployContract(abi,byteCode);
        res.status(200).json({
            "contract":deployedContract
        })
      } catch (error) {
        res.status(401).json({
            "error":error
        }) 
      }
         
  })

  app.get('/registerAssetProxy',async (req,res,next)=>{
    
        
    try {
        let defaultProvider = ethers.getDefaultProvider('rinkeby');
        let  wallet = new ethers.Wallet(process.env,privateKey,defaultProvider);
        const smartContract = new ethers.Contract(exchangeContract,abi,wallet);
        let tx = await smartContract.registerAssetProxy(assetProxyAddress);
        await defaultProvider.waitForTransaction(tx.hash);
        res.json({
            message:"asset proxy registered successfully with transaction hash = " + tx.hash
        })
    } catch (error) {
      res.status(401).json({
          "error":error
      }) 
    }
       
})

app.get('/getAssetProxy',async (req,res,next)=>{
    
        
    try {
        let defaultProvider = ethers.getDefaultProvider('rinkeby');
        let  wallet = new ethers.Wallet(process.env,privateKey,defaultProvider);
        const smartContract = new ethers.Contract(exchangeContract,abi,wallet);
        let tx = await smartContract.getAssetProxy('0xf47261b0');
       
        res.json({
            message:"asset proxy address = " + tx
        })
    } catch (error) {
      res.status(401).json({
          "error":error
      }) 
    }
       
})
  
  


app.get('/authorizeExchange',async (req,res,next)=>{
    
        
    try {
        let isCompiled = await compileContract(assetProxy);
        if (!!isCompiled) {
           console.log("Successfully Compiled!");
           const abi = isCompiled.contracts[":ERC20Proxy"].interface;
        let defaultProvider = ethers.getDefaultProvider('rinkeby');
        let  wallet = new ethers.Wallet(process.env,privateKey,defaultProvider);
        const smartContract = new ethers.Contract(assetProxyAddress,abi,wallet);
        let tx = await smartContract.addAuthorizedAddress(exchangeContract);
        await defaultProvider.waitForTransaction(tx.hash);
        res.json({
            message:"exchange contract authorized successfully with transaction hash = " + tx.hash
        })
    }
    } catch (error) {
      res.status(401).json({
          "error":error
      }) 
    }
       
})


app.get('/getAuthorizeAddress',async (req,res,next)=>{
    
        
    try {
        let isCompiled = await compileContract(assetProxy);
        if (!!isCompiled) {
           console.log("Successfully Compiled!");
           const abi = isCompiled.contracts[":ERC20Proxy"].interface;
        let defaultProvider = ethers.getDefaultProvider('rinkeby');
        let  wallet = new ethers.Wallet(process.env,privateKey,defaultProvider);
        const smartContract = new ethers.Contract(assetProxyAddress,abi,wallet);
        let tx = await smartContract.getAuthorizedAddresses();
        
        res.json({
            message:"authorized addresses" + tx
        })
    }
    } catch (error) {
      res.status(401).json({
          "error":error
      }) 
    }
       
})

  app.get('/assetProxy',async (req,res,next)=>{
    try {
        let isCompiled = await compileContract(assetProxy);
        if (!!isCompiled) {
           console.log("Successfully Compiled!");
           const abi = isCompiled.contracts[":ERC20Proxy"].interface;
           const bytecode = "0x" + isCompiled.contracts[":ERC20Proxy"].bytecode;
           console.log('bytecode',bytecode)
           let deployedContract = await deployContract(abi,bytecode);
           res.status(200).json({
               "contract":deployedContract
           })
        } else {
            res.send("Not able to compile contract")
        }
    } catch (error) {
        res.status(401).json({
            "error":error
        })
    } 
})


//unlimited approval to asset proxy contract for token A
app.get('/approvedByMaker',async (req,res,next)=>{
    try {
        const makerEngine = new Web3ProviderEngine();
        makerEngine.addProvider(makerKeyWallet);
        makerEngine.addProvider(new RPCSubprovider(process.env.rinkebyUrl));
        makerEngine.start();
        let defaultProvider = ethers.getDefaultProvider('rinkeby');
        let contractConfig = {
            contractAddresses: {
                erc20Proxy: assetProxyAddress.toLowerCase(),
                erc721Proxy: '0x1d7022f5b17d2f8b695918fb48fa1089c9f85401',
                zrxToken: '0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
                etherToken: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                exchange: exchangeContract.toLowerCase(),
                assetProxyOwner: '0x04b5dadd2c0d6a261bfafbc964e0cac48585def3',
                forwarder: '0x6000eca38b8b5bba64986182fe2a69c57f6b5414',
                orderValidator: '0x32eecaf51dfea9618e9bc94e9fbfddb1bbdcba15',
                dutchAuction: '0x7e3f4e1deb8d3a05d9d2da87d9521268d0ec3239',
                coordinatorRegistry: '0xaa86dda78e9434aca114b6676fc742a18d15a1cc',
                coordinator: '0x4d3d5c850dd5bd9d6f4adda3dd039a3c8054ca29',
            },
            gasPrice: new BigNumber(40000000000),
            networkId: 4,
        }
        const contractWrappers = new ContractWrappers(makerEngine,contractConfig)
        const makerApprovalHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync( tokenA, makerAddress);
        await defaultProvider.waitForTransaction(makerApprovalHash);
              res.status(200).json({
               "message":"proxy contract appoved by maker and transaction hash is" + makerApprovalHash
           })
        
    } catch (error) {
        res.status(401).json({
            "error":error
        })
    }
 })


 //unlimited approval to asset proxy contract for token B
 app.get('/approvedByTaker',async (req,res,next)=>{
    try {
          
        const takerEngine = new Web3ProviderEngine();
        takerEngine.addProvider(takerKeyWallet);
        takerEngine.addProvider(new RPCSubprovider(process.env.rinkebyUrl));
        takerEngine.start();
        let defaultProvider = ethers.getDefaultProvider('rinkeby');
        let contractConfig = {
            contractAddresses: {
                erc20Proxy: assetProxyAddress.toLowerCase(),
                erc721Proxy: '0x1d7022f5b17d2f8b695918fb48fa1089c9f85401',
                zrxToken: '0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
                etherToken: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                exchange: exchangeContract.toLowerCase(),
                assetProxyOwner: '0x04b5dadd2c0d6a261bfafbc964e0cac48585def3',
                forwarder: '0x6000eca38b8b5bba64986182fe2a69c57f6b5414',
                orderValidator: '0x32eecaf51dfea9618e9bc94e9fbfddb1bbdcba15',
                dutchAuction: '0x7e3f4e1deb8d3a05d9d2da87d9521268d0ec3239',
                coordinatorRegistry: '0xaa86dda78e9434aca114b6676fc742a18d15a1cc',
                coordinator: '0x4d3d5c850dd5bd9d6f4adda3dd039a3c8054ca29',
            },
            gasPrice: new BigNumber(40000000000),
            networkId: 4,
        }
        const contractWrappers = new ContractWrappers(takerEngine,contractConfig)

        const takerApprovalHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync( tokenB, takerAddress);
        await defaultProvider.waitForTransaction(takerApprovalHash);
              res.status(200).json({
               "message":"proxy contract appoved by maker and transaction hash is" + takerApprovalHash
           })
        
    } catch (error) {
        res.status(401).json({
            "error":error
        })
    }
 })

 const getRandomFutureDateInSeconds = () => {
    return new BigNumber(Date.now() + TEN_MINUTES_MS).div(ONE_SECOND_MS).integerValue(BigNumber.ROUND_CEIL);
  };
  

 app.get('/createAndFillOrder',async (req,res,next)=>{
    try {
     
        const makerEngine = new Web3ProviderEngine();
        makerEngine.addProvider(makerKeyWallet);
        makerEngine.addProvider(new RPCSubprovider(process.env.rinkebyUrl));
        makerEngine.start();

        
        
       
        const randomExpiration = getRandomFutureDateInSeconds();
        const order = {
            exchangeAddress:exchangeContract.toLowerCase(),
            makerAddress: makerAddress.toLowerCase(),
            takerAddress: NULL_ADDRESS,
            senderAddress:  NULL_ADDRESS,
            feeRecipientAddress: NULL_ADDRESS,
            expirationTimeSeconds: randomExpiration,
            salt: generatePseudoRandomSalt(),
            makerAssetAmount,
            takerAssetAmount,
            makerAssetData,
            takerAssetData,
            makerFee: ZERO,
            takerFee: ZERO,
        };
        
        const orderHashHex = orderHashUtils.getOrderHashHex(order);
        console.log(orderHashHex,"hash")
        const signature = await signatureUtils.ecSignHashAsync(makerEngine, orderHashHex, makerAddress);
    
        const signedOrder = { ...order, signature };
       
        const takerEngine = new Web3ProviderEngine();
        takerEngine.addProvider(takerKeyWallet);
        takerEngine.addProvider(new RPCSubprovider(process.env.rinkebyUrl));
        takerEngine.start();

        let contractConfig = {
            contractAddresses: {
                erc20Proxy: assetProxyAddress.toLowerCase(),
                erc721Proxy: '0x1d7022f5b17d2f8b695918fb48fa1089c9f85401',
                zrxToken: '0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
                etherToken: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                exchange: exchangeContract.toLowerCase(),
                assetProxyOwner: '0x04b5dadd2c0d6a261bfafbc964e0cac48585def3',
                forwarder: '0x6000eca38b8b5bba64986182fe2a69c57f6b5414',
                orderValidator: '0x32eecaf51dfea9618e9bc94e9fbfddb1bbdcba15',
                dutchAuction: '0x7e3f4e1deb8d3a05d9d2da87d9521268d0ec3239',
                coordinatorRegistry: '0xaa86dda78e9434aca114b6676fc742a18d15a1cc',
                coordinator: '0x4d3d5c850dd5bd9d6f4adda3dd039a3c8054ca29',
            },
            gasPrice: new BigNumber(40000000000),
            networkId: 4,
        }
        const contractWrappers = new ContractWrappers(takerEngine,contractConfig)
        
        let txHash = await contractWrappers.exchange.fillOrderAsync(signedOrder, takerAssetAmount, takerAddress, {TX_DEFAULTS});
        console.log(txHash,"transaction");

       const web3Wrapper = new Web3Wrapper(takerEngine);


        var transaction = await web3Wrapper.awaitTransactionSuccessAsync(txHash);
        console.log(transaction);


     


       
    //     console.log(sign,"signa")
           res.status(200).json({
               "message":"order hex hash" + makerEngine
           })
       
    } catch (error) {
       console.log(error,"eroor")
    }
 })







 app.listen(process.env.port,()=>{
    console.log("listening on port",process.env.port)
})
