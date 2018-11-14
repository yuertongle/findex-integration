import React from 'react';
import { WebView } from 'react-native';
import Eos from 'eosjs';

const exampleConfig = {
  chainId : 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
  httpEndpoint : 'https://mainnet.eosio.sg',
  keyProvider : 'example-privatekey',  //this key should belong to one or more accounts existed on EOS Mainnet
  expireInSeconds: 60,
  broadcast: true,
  verbose: false,
  sign: true,
};

const eos = Eos(exampleConfig);

class WebViewForFindex extends React.Component {

  constructor(props){
    super(props);
    this.state = {};
  }

  transaction = (msgData) => {
    eos.transaction({
      actions: msgData.actions
    }).then((res) => {
      this.myWebView.postMessage(JSON.stringify({code: 200, info: 'We have received your data', data: res}));
    }).catch(err => {
      this.myWebView.postMessage(JSON.stringify({code: 400, errMessage: err}));
    })
  }

  onWebViewMessage = (event) => {
    let msgData;

    try {
      msgData = JSON.parse(event.nativeEvent.data);
      this.myWebView.postMessage(JSON.stringify({code: 200, info: 'We have received your data'}));
    } catch (err) {
      this.myWebView.postMessage(JSON.stringify({code: 400, errMessage: 'Error when parsing data'}));
      return;
    }

    //Get the function the website hope to executed by wallet
    switch (msgData.targetFunc) {
      // More cases can be defined here, for findex, normally ask eos account to execute transaction function
      case "transaction":
        // Before execute transaction function to sign for data, it's better to show msgData to users to let give users the chance to review the transaction
        this[msgData.targetFunc].apply(this, [msgData]);
        break;
    }

  }

  render() {
    return <WebView onMessage={this.onWebViewMessage}
                    ref={webview => {
                      this.myWebView = webview;
                    }}
                    source={{uri: 'https://example.findex.one?inWallet=tokenPocket&eos_account=examplename1&lang=zh-CN'}}/>
  }
}

module.exports = WebViewForFindex;
