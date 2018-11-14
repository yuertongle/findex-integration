## FINDEX INTEGRATION

There are three methods to integrate your project with Findex:
1. **Iframe Integration**. If your project is a website, you can create an iframe in your page, open Findex in the iframe. Click [here](https://betdice.one/exchange/) to see the example: findex in betdice.
2. **Wallet Integration**. If your project is a wallet APP, you can put a link to Findex in your wallet (Open Findex in webview).  You can see Findex in Tokenpocket、 Meetone etc.
3. **Develop your own Front-end and use findex JS API**. If you want to develop UI by yourself, we have prepared the [JS API](https://github.com/yuertongle/findex-integration/blob/master/for_DIY/findex_api.js) for you.


---

## Method 1: Iframe Integration
#### Test whether findex is suitable for your project or not:

1. Create an iframe DOM in your local project, put the src='https://iframe.findex.pro'.
2. Add the code below in your project, replace 'example11111' with your eosAccount. please ensure it is executed after the iframe has loaded.
   ```javascript
   const target = document.getElementsByTagName('iframe')[0].contentWindow
   target.postMessage(
       JSON.stringify({
           isSuccessful: true,
           args: {
               name: 'example11111',
               eosAccount: 'example11111',
               type: 1
           },
           msgId: 'parentLogin'
       }),
       '*'
   )
   ```
3. Run your project, if you can see your balance in the trading pannel, congratulation, let's start the integration. If not, no worries, contact findex team to inspect.

#### Integration findex in your project:

1. Add event listener in your project:
   ```javascript
   window.addEventListener('message', (e) => {
         tackleReceiveMessage(e)
       }, 
       false
   );
   ```
2. Customize your tackleReceiveMessage function, here is an example:
   
   ```javascript
    tackleReceiveMessage = (e) => {
         try {
           let message = JSON.parse(e.data)
           if (message.targetFunc === 'execute') {
             //execute() is called when user set or cancel order，there is an example below
             execute(message, e)
           } else if (message.targetFunc === 'setIframeHeight') {
             //setIframeHeight would allow you to set the height of iframe dynamically
             //setIframeHeight(message.iframeHeight)
           }
         } catch (err) {
           console.error('failed to parse message ' + err)
         }
       }
   ```
3. Realise the execute function appeared in step 2.
   ```javascript
    const execute = (message, e) => {   
         const data = message.data
         //console.log(data)
         //scatter is which you got after login using scatter
         scatter.eos.transaction(data).then(() => {
           //the format of data is fixed, you are suggested not to change.
           let data = JSON.stringify({ isSuccessful: true, args: {}, msgId: message.msgId })
           e.source.postMessage(data, e.origin)
         }).catch((err) => {
           //the format of data is fixed, you are suggested not to change.
           let data = JSON.stringify({ isSuccessful: false, args: err, msgId: message.msgId })
           e.source.postMessage(data, e.origin)
         })
     }
   ```

4. Let Findex know when user login or logout：
      
   ```javascript
    //Call these two function when user login or logout.
    //Reminder: If execute these two function before iframe has finished loading, Findex would fail in login or logout
    const addAccountToDex = () => { 
          //Be sure select the right Findex iframe  
          const target = document.getElementsByTagName('iframe')[0].contentWindow
          target.postMessage(
              JSON.stringify({
                  isSuccessful: true,
                  args: {
                      name: 'example11111',
                      eosAccount: 'example11111',
                      type: 1
                  },
                  msgId: 'parentLogin'
              }),
              '*'
          )    
     };
       
     const removeAccountFromDex = () => {
          //Be sure select the right Findex iframe
          const target = document.getElementsByTagName('iframe')[0].contentWindow
          target.postMessage(
              JSON.stringify({
                   isSuccessful: true,
                   args: {},
                   msgId: 'parentLogout'
              }),
              '*'
          )
     };
     ```  
 5. Check if findex can login/logout in your project, also set buy/sell/cancel orders. If everything is OK, You are going to succeed.
 6. Add parameters in the iframe src link.
  + Add the URL of the node you like (Findex will get infomation like account's balance etc. from the node)
  + Add your project name in the link
  + Add trading pairs you want to show. Click [here](https://github.com/yuertongle/findex-integration/blob/master/for_iframe_integration/tradingPair.json) to see the trading pair list Findex is supporting.  
  If your project name is 'example', you hope to show 'MEETONE/EOS' and 'BLACK/EOS' in the exchange, and you based in North America, choose the node greymass (you think the node greymass will server you fast), then you the URL is like https://iframe.findex.pro?projectname=example&&showpairs=9,12&&httpendpoint=https://eos.greymass.com 
 7. If you want to customize 'your findex' further, please contact with Findex team.


#### Reference:
Here is an [example](https://gist.github.com/jafri/b52dd82aad68cd54657510718969269b) (vue project) from EOS Cafe.


---

## Method 2: Wallet Integration

#### If your wallet has realised scatter feature:
For this condition, it's easy to integrate with Findex, just add a link to Findex in your wallet, and put your wallet name in the project. The final link will be https://mainnet.findex.one?walletname=example. You finish the integration.

#### If your wallet hasn't realised scatter feature:
1. You may use directly or strengthen the Component in the [example](https://github.com/yuertongle/findex-integration/blob/master/for_wallet_integration/demo-webview.js)  
2. Give your wallet name, eos_account logged in the wallet and language as parameters in the url.
```javascrip.
return <WebView onMessage={this.onWebViewMessage}
                ref={webview => {
                  this.myWebView = webview;
                }}
                source={{uri: 'https://example.findex.one?inWallet=tokenPocket&eos_account=examplename1&lang=zh-CN'}}/>
```  
*  If no account has logged in, eos_account should be dismissed;
*  English would be the default language if no parameter - lang is given.


3. For better user experience, we strongly suggested that showing transaction data to let user double confirm.
```javascript
switch (msgData.targetFunc) {          
  case 'transaction':
    //Show transaction detail to users.
    this[msgData.targetFunc].apply(this, [msgData]);
    break;
}
```


 
---

## Method 3: Develop your own Front-end and use findex JS API
Use the api given in [findex-api.js](https://github.com/yuertongle/findex-integration/blob/master/for_DIY/findex_api.js) to request from Findex smart(Get orderbook, sell/buy/cancel orders), and develop your front end.
