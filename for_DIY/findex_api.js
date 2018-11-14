import Eos from 'eosjs';

let eos = null ;

const exchangeContract = 'findexfindex';
let chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
let httpEndpoint = 'https://mainnet.libertyblock.io:7777'
let keyProvider = ''

let eosConfig = {
  chainId: chainId,
  httpEndpoint: httpEndpoint,
  keyProvider,
  verbose: true
}

eos = Eos(eosConfig)




//===================get trading pair===============================
export const getTokenRelatedInfo = () => {
  return getTokenInfo().then( (data) => {

    const pairs = data[0].rows;
    const tokens = data[1].rows;
    const tokenTable = getTokenTable(tokens);
    const { tradingPairTable, tradingPairList } = getTradingPairTable(pairs, tokenTable);

    return {tradingPairList, tradingPairTable, tokens}

  }).catch(err => {
    console.log(err);
  }) ;
}


const getTokenInfo = () => {
  return Promise.all([
    eos.getTableRows({
      json: true,
      code: exchangeContract,
      scope: exchangeContract,
      table: 'pairs',
      limit: 1000,
    }),
    eos.getTableRows({
      json: true,
      code: exchangeContract,
      scope: exchangeContract,
      table: 'tokens',
      limit: 1000,
    })
  ]).then((res) => {
    return res
  }).catch((err)=>{
    console.log(err);
  })
}

const getTokenTable = (tokens) => {
  let table = {};
  tokens.map((token) => {
    table[token.id] = {
      precision: token.precision,
      symbol: token.symbol_name,
      value: token.ext_symbol.value,
      contract: token.ext_symbol.contract,
      id: token.id,
    }
  })
  return table
}


const getTradingPairTable = (pairs, tokenTable) => {
  let table = {};
  let tradingPairList = [];
  pairs.map((pair) => {
    try{
      const baseInfo = tokenTable[pair.base_id];
      const baseName = baseInfo.symbol;
      const quoteInfo = tokenTable[pair.quote_id];
      const quoteName = tokenTable[pair.quote_id].symbol;

      if(!table[baseName]){
        table[baseName] = []
      }

      const pricePrecisionNum = Math.log10(pair.price_precision);
      let pairDic = {
        exToken: quoteName,
        baseToken: baseName,
        exID: pair.quote_id,
        baseID: pair.base_id,
        exContract: quoteInfo.contract,
        baseContract: baseInfo.contract,
        pairDisplayName: quoteName + '/' + baseName,
        pairShowName: quoteName + ' / ' + baseName,
        exPrecision: Math.log10(quoteInfo.precision),
        basePrecision: Math.log10(baseInfo.precision),
        pricePrecision: pair.price_precision,
        exSymbolValue: quoteInfo.value,
        baseSymbolValue: baseInfo.value,
        minimumVolume: pair.minimum_volume,
        pricePrecisionNum,
        pairID: pair.id
      };

      if(baseName == 'DICE'){
        pairDic.minimumVolume = 100000
      }

      table[baseName].push(pairDic);
      tradingPairList.push(pairDic);
    }catch(err){
      console.log(err);
    }
  })

  return { tradingPairTable : table, tradingPairList };
}
//===================end of get trading pair===============================



//===================get order books===============================
// currentTradingPair is one of the value 'tradingPairList' of the object returned by the method above getTokenRelatedInfo()
// name is the eosAccount which one's balance are request

export const getOrderBooks = (currentTradingPair) => {
  if(!currentTradingPair.exToken){
    return
  }
  const buyScope = currentTradingPair.pairID * 100 + 1;
  const sellScope = currentTradingPair.pairID * 100 + 2;
  const pricePrecision = currentTradingPair.pricePrecision;
  return Promise.all([
    eos.getTableRows({
      json: true,
      code: exchangeContract,
      scope: buyScope,
      table: 'orders',
      table_key: 'active',
      key_type:'i128',
      index_position: 3,
      limit: 30}
    ),
    eos.getTableRows({
      json: true,
      code: exchangeContract,
      scope: sellScope,
      table: 'orders',
      table_key: 'active',
      key_type:'i128',
      index_position: 2,
      limit: 30}
    )]).then((res)=>{
    const [buyOrder, sellOrder] = drinkFinalData({buy: res[0].rows, sell: res[1].rows}, pricePrecision);
    return {buyOrder, sellOrder};
  }).catch(err => {
    console.log(err);
  })
}

const drinkFinalData = (data, pricePrecision) => {
  let dataBuy = [];
  let dataSell = [];

  let orderBookSingleSideLength = 10;

  while(dataBuy.length < orderBookSingleSideLength && data.buy.length > 0){
    let tmp = data.buy.shift();
    tmp.amount = Number(tmp.quantity.split(' ')[0]);
    tmp.price = Number(tmp.price)/pricePrecision;
    let alreadyStoredLast = dataBuy[dataBuy.length -1];
    if(!alreadyStoredLast){
      dataBuy.push({price: tmp.price, amount: tmp.amount, total: tmp.amount})
    }else if(alreadyStoredLast.price == tmp.price){
      dataBuy[dataBuy.length-1].amount += tmp.amount;
      dataBuy[dataBuy.length-1].total += tmp.amount;
    }else{
      dataBuy.push({price: tmp.price, amount: tmp.amount, total: alreadyStoredLast.total + tmp.amount})
    }
  }
  while(dataSell.length < orderBookSingleSideLength && data.sell.length > 0){
    let tmp = data.sell.shift();
    tmp.amount = Number(tmp.quantity.split(' ')[0]);
    tmp.price = Number(tmp.price)/pricePrecision;
    let alreadyStoredLast = dataSell[dataSell.length -1];
    if(!alreadyStoredLast){
      dataSell.push({price: tmp.price, amount: tmp.amount, total: tmp.amount})
    }else if(alreadyStoredLast.price == tmp.price){
      dataSell[dataSell.length-1].amount += tmp.amount;
      dataSell[dataSell.length-1].total += tmp.amount;
    }else{
      dataSell.push({price: tmp.price, amount: tmp.amount, total: alreadyStoredLast.total + tmp.amount})
    }
  }
  return [dataBuy, dataSell.reverse()]
}
//===================end of get order books===============================




//===================get balance=======================================
// currentTradingPair is one of the value 'tradingPairList' of the object returned by the method above getTokenRelatedInfo()
// name is the eosAccount which one's balance are request
export const getBalance = (currentTradingPair, name) => {
  const { baseToken, exToken, baseContract, exContract } = currentTradingPair;
  return Promise.all([
    eos.getCurrencyBalance({ code: baseContract, account: name, symbol: baseToken }),
    eos.getCurrencyBalance({ code: exContract, account: name, symbol: exToken }),
  ]).then((res) => {
    let base = res[0][0];
    if (base) {
      base = Number(base.split(' ')[0]);
    }else{
      base = 0;
    }
    let ex = res[1][0];
    if (ex) {
      ex = Number(ex.split(' ')[0]);
    }else{
      ex = 0;
    }

    return { [baseToken]: base, [exToken]: ex }
  }).catch((err) => {
    console.log(err);
  });
}
//===================end of get balance===============================



//===================get orders=======================================
// currentTradingPair is one of the value 'tradingPairList' of the object returned by the method above getTokenRelatedInfo()
// name is the eosAccount which one's orders are searched
export const getCurrentOrders = (currentTradingPair, name) => {
  return eos.getTableRows({
    json: true,
    code: exchangeContract,
    scope: name,
    table: 'records',
    table_key: 'active',
    limit: 1000,
  }).then((res) => {
    return res.rows.reverse()
  }).catch((err) => {
    console.log(err);
  });
}
//===================end of get orders===============================




//===================set buy order===============================
// currentTradingPair is one of the value 'tradingPairList' of the object returned by the method above getTokenRelatedInfo()
// username is the eosAccount which buy tokens
// price has maximum 6 decimals, eg: 1.000011
// amount usually has maximum 4 decimals, eg: 100.0505
export const setBuyOrder = ( currentTradingPair, username, price, amount ) => {

  const { baseToken, basePrecision, minimumVolume, exPrecision, pricePrecision, exToken, baseContract, pairID } = currentTradingPair;

  let tradeAmount = price * amount * 10 ** basePrecision;
  let transferQuantity = parseFloat(Math.ceil(tradeAmount)/10 ** basePrecision).toFixed(basePrecision) + ' ' + baseToken;
  if(tradeAmount < Number(minimumVolume)){
    //trade amount is too small, for example: minimum amount for per order is 0.1 EOS
    return
  }

  const quote_quantity = parseFloat(amount).toFixed(exPrecision) + ' ' + exToken;
  const maximum_price = Math.floor(price * pricePrecision);
  const data = {
    actions: [
      {
        account: baseContract,
        name: 'transfer',
        authorization: [{
          actor: username,
          permission: 'active'
        }],
        data: {
          from: username,
          to: exchangeContract,
          quantity: transferQuantity,
          memo: '',
        }
      },
      {
        account: exchangeContract,
        name: 'buyorder',
        authorization: [{
          actor: username,
          permission: 'active',
        }],
        data: {
          r_buy_order: {
            remark:'',
            buyer: username,
            pair_id: pairID,
            quote_quantity,
            maximum_price,
          }
        },
      },
    ],
  };
  return eos.transaction(data);

}
//===================end of buy order===============================



//===================set sell order===============================
// currentTradingPair is one of the value 'tradingPairList' of the object returned by the method above getTokenRelatedInfo()
// username is the eosAccount which sell tokens
// price has maximum 6 decimals, eg: 1.000011
// amount usually has maximum 4 decimals, eg: 100.0505
export const setSellOrder = ( currentTradingPair, username, price, amount ) => {
  const { basePrecision, minimumVolume, exPrecision, pricePrecision, exToken, exContract, pairID } = currentTradingPair;
  const tradeAmount = amount * price * 10 ** basePrecision;
  if(tradeAmount < Number(minimumVolume)){
    //trade amount is too small, for example: minimum amount for per order is 0.1 EOS
    return
  }

  const quantity =  parseFloat(amount).toFixed(exPrecision) + ' ' + exToken;
  const quote_quantity = parseFloat(amount).toFixed(exPrecision) + ' ' + exToken;
  const minimum_price = Math.floor(price * pricePrecision);

  const data = {
    actions: [
      {
        account: exContract,
        name: 'transfer',
        authorization: [{
          actor: username,
          permission: 'active'
        }],
        data: {
          from: username,
          to: exchangeContract,
          quantity,
          memo: '',
        }
      },
      {
        account: exchangeContract,
        name: 'sellorder',
        authorization: [{
          actor: username,
          permission: 'active',
        }],
        data: {
          r_sell_order: {
            remark:'',
            seller: username,
            pair_id: pairID,
            quote_quantity,
            minimum_price,
          }
        },
      },
    ],
  }
  return eos.transaction(data);
}
//===================end of set sell order===============================



//===================cancel order===============================
// tradingPairList is the value of object returned by the method above getTokenRelatedInfo()
// order is any one of the list returned by the method above getCurrentOrders()
// username is the eosAccount of the orders' owner
export const cancelOrder = (tradingPairList, order, username) => {
  const tradingPairID = parseInt(order.scope / 100);
  const isBuyOrder = order.scope % 100 == 1;
  let pairOrderBelongTo = tradingPairList.filter((row) => row.pairID == tradingPairID)
  const token_id = pairOrderBelongTo[0][isBuyOrder ? 'baseID' : 'exID'];
  const data = {
    actions: [
      {
        account: exchangeContract,
        name: 'cancelorder',
        authorization: [{
          actor: username,
          permission: 'active',
        }],
        data: {
          r_cancel_order: {
            user: username,
            record_id: order.id,
          }
        },
      },
      {
        account: exchangeContract,
        name: 'withdraw',
        authorization: [{
          actor: username,
          permission: 'active',
        }],
        data: {
          r_withdraw: {
            user: username,
            token_id,
          }
        },
      },
    ],
  };
  return eos.transaction(data)
}
//===================end of cancel order===============================
