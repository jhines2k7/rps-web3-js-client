let wagerConfimation;
let wagerAccepted = false;
let opponentWagerAccepted = false;
let web3Provider;
let contracts = {};
let socket = null;
let timeout;
let buttons;

let gameId;
let playerId;
let wagerInput;
let yourWagerInEther;
let oppWagerStatus;
let oppWagerOffer;
let yourWagerStatus;
let yourWagerOffer;
let wagerButtons;
let acceptWagerBtn;
let declineWagerBtn;
let opponentId;
let opponentWager;
let oppWagerInEther;
let yourWager;
let oppWager;
let acceptedWagerStatus;
let results;
let winLoseDraw;
let yourChoice;
let oppChoice;
let outcome;
let symbolChoiceDiv;
let rockBtn;
let paperBtn;
let scissorsBtn;
let offerWagerBtn;
let oppWagerInDollars;
let oppId;
let wagerInputPlaceholder;
let joinContractStatus;

function disableChoiceButtons() {
  buttons.forEach((button) => {
    if (button.id !== 'offer-wager')
      button.disabled = true;
  });
}

function enableChoiceButtons() {
  buttons.forEach((button) => {
    if (button.id === 'rock' || button.id === 'paper' || button.id === 'scissors') {
      button.disabled = false;
    }
  });
}

function disableWagerButtons() {
  offerWagerBtn.disabled = true;
  acceptWagerBtn.disabled = true;
  declineWagerBtn.disabled = true;
}

function registerDOMEventListeners() {
  acceptWagerBtn.addEventListener('click', () => {
    oppWager.innerText = `Wagered ${oppWagerInDollars}`;
    (async () => {
      const wagerInEth = await dollarsToEthereum(oppWagerInDollars.replace(/^\$/, ''));
      oppWagerInEther.innerText = `in eth: ${wagerInEth}`;
    })();
    socket.emit('accept_wager');
    acceptWagerBtn.disabled = true;
    declineWagerBtn.disabled = true;

    oppWagerStatus.innerText = `You accepted the ${oppWagerInDollars} wager from ${oppId}`;
    oppWagerOffer.innerText = '';

    wagerAccepted = true;

    if (wagerAccepted && opponentWagerAccepted) {
      enableChoiceButtons();
      disableWagerButtons();
    }
  });

  offerWagerBtn.addEventListener('click', () => {
    var wagerValue = wagerInput.value;

    console.log(`wagerValue: ${wagerValue}`);

    socket.emit('offer_wager', { wager: wagerValue });

    offerWagerBtn.disabled = true;
    wagerInput.disabled = true;
    if(!wagerAccepted) {
      oppWagerStatus.innerText = '';
    }
    oppWagerOffer.innerText = '';
    yourWagerOffer.innerText = `You offered a ${wagerValue} wager. Waiting for ${oppId} to accept wager...`;
    yourWagerStatus.innerText = '';
  });

  declineWagerBtn.addEventListener('click', () => {
    socket.emit('decline_wager');
    offerWagerBtn.disabled = false;
    wagerInput.disabled = false;
    acceptWagerBtn.disabled = true;
    declineWagerBtn.disabled = true;
  });

  wagerInput.addEventListener('input', function () {
    if (this.value === '' || this.value === '0' || this.value === '$') {
      yourWagerInEther.innerText = 'in eth: 0.00000';
      offerWagerBtn.disabled = true;
    } else {
      clearTimeout(timeout)
      this.value = this.value.replace(/^\$/, ''); // Remove $ if entered by the user
      this.value = `$${this.value}`; // Add $ at the starting of the string    
      const dollars = this.value;
      timeout = setTimeout(async () => {
        try {
          const result = await dollarsToEthereum(dollars.replace(/^\$/, ''));
          yourWagerInEther.innerText = `in eth: ${result}`;
          offerWagerBtn.disabled = false;
        } catch (err) {
          console.error(err);
        }
      }, 1000);
    }
  });

  wagerInput.addEventListener('focus', function () {
    this.placeholder = '';
  });

  wagerInput.addEventListener('blur', function () {
    if (this.value == '') {
      this.placeholder = wagerInputPlaceholder;
    }
  });

  buttons.forEach((button) => {
    if (button.id === 'rock' || button.id === 'paper' || button.id === 'scissors') {
      button.addEventListener('click', () => {
        wagerAccepted = false;
        opponentWagerAccepted = false;

        socket.emit('choice', {
          choice: button.id,
          wager: wagerInput.value.replace(/^\$/, '')
        });

        disableChoiceButtons();
        removeOtherChoiceButtons(button.id);
      });
    }
  });
}

function removeOtherChoiceButtons(choice) {
  buttons.forEach((button) => {
    if (button.id !== choice) {
      button.remove();
    }
  });
}

function registerSocketIOEventListeners() {
  socket.on('wager_offered', (data) => {
    oppWagerInDollars = data.wager;
    oppWagerOffer.innerText = `You were offered a ${data.wager} wager from ${data.opponent_id}`;
    oppWagerStatus.innerText = '';
    declineWagerBtn.disabled = false;
    acceptWagerBtn.disabled = false;
  });

  socket.on('wager_declined', (data) => {
    oppWagerOffer.innerText = '';
    oppWagerStatus.innerText = `${data.playerId} declined your wager.`;
    offerWagerBtn.disabled = false;
    wagerInput.disabled = false;
    acceptWagerBtn.disabled = true;
    declineWagerBtn.disabled = true;
  });

  socket.on('generating_contract', (data) => {
    joinContractStatus.innerText = 'Generating contract...';
  });

  socket.on('wager_accepted', (data) => {
    opponentWagerAccepted = true;
    oppWagerStatus.innerText = '';
    oppWagerOffer.innerText = '';
    yourWagerOffer.innerText = '';
    yourWagerStatus.innerText = `${data.opponent_id} accepted your wager.`;
    console.log(`data from wager_accepted event: ${JSON.stringify(data)}`);

    if (data.your_wager && data.opponent_wager) {
      yourWager.innerText = `YOU wagered ${data.your_wager}`;
      opponentWager.innerText = `OPP wagered ${data.opponent_wager}`;
      enableChoiceButtons();
      disableWagerButtons();

      // join the created RPS contract
      const stakeUSD = data.your_wager.replace(/^\$/, '');
      console.log(`Wager accepted by both parties. Joining RPSContract with address: ${data.contractAddress}`)
      console.log(`Stake in USD: ${stakeUSD}`);
      joinContract(parseFloat(stakeUSD), data.contractAddress);
    }
  });

  socket.on('connect_error', (error) => {
    console.log(error);
  });

  socket.on('connected', (data) => {
    playerId.innerText = `(${data.playerId})`;
    gameId.innerText = 'Game ID: ' + data.sessionId;
    oppWagerStatus.innerText = '';
    yourWager.innerText = '';
    yourWagerInEther.innerText = 'in eth: 0.00000';
    wagerInput.value = '';
    yourWagerOffer.innerText = '';
    yourWagerStatus.innerText = '';
    oppWagerOffer.innerText = '';
    oppWagerStatus.innerText = '';
    disableChoiceButtons();
    disableWagerButtons();
    if (data.opponentId) {
      wagerInput.disabled = false;
      offerWagerBtn.disabled = false;
      opponentId.innerText = `(${data.opponentId})`;
      opponentId.classList.remove('flashing');
      oppId = data.opponentId;
    }
  });

  socket.on('opponent_connected', (data) => {
    opponentId.innerText = `(${data.opponentId})`;
    opponentId.classList.remove('flashing');
    oppId = data.opponentId;
    wagerInput.disabled = false;
    offerWagerBtn.disabled = false;
  });

  socket.on('opponent_disconnected', (data) => {
    opponentId.innerText = 'Waiting for an opponent to join...';
    opponentId.classList.add('flashing');
    disableChoiceButtons();
    yourWagerOffer.innerText = '';
    yourWagerStatus.innerText = '';
    oppWagerOffer.innerText = '';
    oppWagerStatus.innerText = '';
  });

  socket.on('result', (data) => {
    yourChoice.innerText = `YOU chose ${data.yourChoice.toUpperCase()}`;
    oppChoice.innerText = `OPP chose ${data.opponentChoice.toUpperCase()}`;
    console.log(`rock paper scissors result: ${JSON.stringify(data)}`);
    if (data.winnings > 0) {
      winLoseDraw.innerText = 'You won';
      outcome.innerText = `YOU won $${data.winnings}`;
    } else {
      winLoseDraw.innerText = 'You lost';
      outcome.innerText = `YOU lost $${Math.abs(data.winnings)}`;
    }
    
    disableChoiceButtons();
    disableWagerButtons();
  });
}

async function dollarsToEthereum(dollars) {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json();
    let ethInUsd = dollars / data.ethereum.usd;
    console.log(`The value of $${dollars} in ETH is: ${ethInUsd}`);
    return ethInUsd;
  } catch (err) {
    return console.log(err);
  }
}

window.addEventListener('beforeunload', (event) => {
  socket.emit('refresh');
});

async function loadContractABI(name) {
  return fetch(name)
    .then(response => response.json())
    .then(data => {
      // Use the loaded JSON data here
      console.log(data);
      return data;
    })
    .catch(error => {
      // Handle any potential errors
      console.error(`Error: ${error}`);
    });
}

async function joinContract(stakeUSD, contractAddress) {
  // Wait for window.ethereum to be present
  while (!window.ethereum) {
    console.log('Waiting for MetaMask...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const web3 = new Web3(window.ethereum);
  
  // Request access to user's MetaMask accounts
  await window.ethereum.request({ method: 'eth_requestAccounts' })

  // Use web3.js
  const accounts = await web3.eth.getAccounts();
  console.log(`Your accounts: ${accounts}`);

  // Fetch the RPSContract
  const rpsContractABI = await loadContractABI('contracts/RPSContract.json');
  const RPSContract = new web3.eth.Contract(rpsContractABI.abi, web3.utils.toChecksumAddress(contractAddress));

  const nonce = await web3.eth.getTransactionCount(accounts[0]);
  console.log(`The nonce for your address is ${nonce}`);

  const gasPrice = await web3.eth.getGasPrice();
  let gasPriceBigInt = web3.utils.toBigInt(gasPrice);

  // Increase the gas price by 2%
  const gasPricePlusTwoPercent = web3.utils.toBigInt(gasPriceBigInt) * web3.utils.toBigInt(102) / web3.utils.toBigInt(100);
  console.log(`Calling joinContract(): the gas price plus 2% is ${gasPricePlusTwoPercent}`);

  let stakeInEther = await convertUsdToEther(stakeUSD);
  console.log(`The stake in Ether is ${stakeInEther}`);
  // stakeInEther *= 0.1; // for testing purposes
  // const stakeInWei = web3.utils.toWei(stakeInEther.toString(), 'ether');
  console.log(`The stake in Wei is ${web3.utils.toWei(stakeInEther.toString(), 'ether')}`);

  const encodedData = RPSContract.methods.joinContract().encodeABI();
  const transaction = {
    'from': web3.utils.toChecksumAddress(accounts[0]),
    'to': web3.utils.toChecksumAddress(contractAddress),
    'value': '0x' + web3.utils.toBigInt(web3.utils.toWei('0.0012533134474266342', 'ether')).toString(16),
    // 'value': '0x' + web3.utils.toBigInt(web3.utils.toWei(stakeInEther.toString(), 'ether')).toString(16),
    'nonce': nonce,
    'gas': 500000,  // You may need to change the gas limit
    'gasPrice': gasPricePlusTwoPercent,
    'data': encodedData,
  };
//0.0012533134474266342
  joinContractStatus.innerText = 'Joining players to contract...';

  const txHash = web3.eth.sendTransaction(transaction);

  txHash.on('transactionHash', function (hash) {
    joinContractStatus.innerText = 'Transaction hash received. Waiting for transaction to be mined...';
    // Transaction hash received
    console.log(`The transaction hash is ${hash}`);
    socket.emit('join_contract_transaction_hash_received', {
      transactionHash: hash,
      playerAddress: accounts[0], 
      contractAddress: contractAddress,
    });
  });

  txHash.on('receipt', function (receipt) {
    joinContractStatus.innerText = 'Transaction receipt received. Transaction mined, waiting for confirmation...';
    // Transaction receipt received
    console.log(`The receipt is ${receipt}`);
    // socket.emit('join_contract_transaction_receipt_received', {
    //   receipt: receipt
    // });
  });

  txHash.on('confirmation', function (confirmation, receipt) {
    joinContractStatus.innerText = 'Transaction confirmed.';
    joinContractStatus.classList.remove('flashing');
    // Transaction confirmed
    console.log(`The confirmation number is ${confirmation}`);
    // socket.emit('join_contract_confirmation_received', { 
    //   playerAddress: accounts[0], 
    //   contractAddress: contractAddress, 
    //   confirmation: confirmation 
    // });
    let gameSection = document.getElementById('game-section');
    gameSection.style.display = 'contents';
  });

  txHash.on('error', function (error) {
    // Transaction error occurred
    console.error(`An error occurred: ${error}`);
  });  
}

async function getEtherPriceInUSD() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json();
    return data.ethereum.usd;
  } catch (err) {
    console.error(`An error occurred: ${err}`);
  }
}

async function convertUsdToEther(amountInUsd) {
  const priceOfEtherInUsd = await getEtherPriceInUSD();
  const amountInEther = amountInUsd / priceOfEtherInUsd;
  return amountInEther;
}

// (async () => {
//   while (!window.ethereum) {
//     console.log('Waiting for MetaMask...');
//     await new Promise(resolve => setTimeout(resolve, 1000));
//   }
// })();

document.addEventListener('DOMContentLoaded', () => {
  buttons = document.querySelectorAll('button');
  gameId = document.getElementById('game-id');
  playerId = document.getElementById('player-id');
  wagerInput = document.getElementById('wager-input');
  wagerInputPlaceholder = wagerInput.placeholder;
  yourWagerInEther = document.getElementById('your-wager-in-ether');
  wagerButtons = document.getElementById('wager-buttons');
  acceptWagerBtn = document.getElementById('accept-wager');
  declineWagerBtn = document.getElementById('decline-wager');
  opponentId = document.getElementById('opp-id');
  oppWagerInEther = document.getElementById('opp-wager-in-ether');
  yourWager = document.getElementById('your-wager');
  oppWager = document.getElementById('opp-wager');
  acceptedWagerStatus = document.getElementById('accepted-wager-status');
  results = document.getElementById('results');
  winLoseDraw = document.getElementById('win-lose-draw');
  yourChoice = document.getElementById('your-choice');
  oppChoice = document.getElementById('opp-choice');
  outcome = document.getElementById('outcome');
  rockBtn = document.getElementById('rock');
  paperBtn = document.getElementById('paper');
  scissorsBtn = document.getElementById('scissors');
  offerWagerBtn = document.getElementById('offer-wager');
  opponentWager = document.getElementById('opponent-wager');
  yourWagerOffer = document.getElementById('your-wager-offer');
  yourWagerStatus = document.getElementById('your-wager-status');
  oppWagerOffer = document.getElementById('opp-wager-offer');
  oppWagerStatus = document.getElementById('opp-wager-status');
  joinContractStatus = document.getElementById('join-contract-status');

  // socket = io('http://24.144.112.170:8000', { transports: ['websocket'] });
  socket = io('https://dev.generalsolutions43.com', {transports: ['websocket']});

  disableChoiceButtons();
  registerDOMEventListeners();
  registerSocketIOEventListeners();
});