let wagerConfimation;
let wagerAccepted = false;
let opponentWagerAcceptedP = false;
let web3Provider;
let contracts = {};
let socket = null;
let timeout;
let choiceButtons;

let gameIdP;
let gameId;
let playerId;
let wagerInput;
let yourWagerPInEtherP;
let oppWagerStatusP;
let oppWagerOfferP;
let yourWagerStatusP;
let yourWagerOfferP;
let wagerButtons;
let acceptWagerBtn;
let declineWagerBtn;
let opponentJoinP;
let opponentWagerP;
let oppWagerInEtherP;
let yourWagerP;
let oppWagerP;
let acceptedWagerStatusP;
let resultsDiv;
let winLoseDrawP;
let yourChoiceP;
let oppChoiceP;
let outcomeP;
let rockBtn;
let paperBtn;
let scissorsBtn;
let offerWagerBtn;
let oppWagerInDollars;
let oppId;
let wagerInputPlaceholder;
let joinContractStatusP;

let accounts = [];
let web3 = null;
let joinGameInterval;

function disableChoiceButtons() {
  choiceButtons.forEach((button) => {
    if (button.id !== 'offer-wager')
      button.disabled = true;
  });
}

function enableChoiceButtons() {
  choiceButtons.forEach((button) => {
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
    oppWagerP.innerText = `Wagered ${oppWagerInDollars}`;
    (async () => {
      const wagerInEth = await dollarsToEthereum(oppWagerInDollars.replace(/^\$/, ''));
      oppWagerInEtherP.innerText = `in eth: ${wagerInEth}`;
    })();
    socket.emit('accept_wager', { address: accounts[0], game_id: gameId });
    acceptWagerBtn.disabled = true;
    declineWagerBtn.disabled = true;

    oppWagerStatusP.innerText = `You accepted the ${oppWagerInDollars} wager from your opponent.`;
    oppWagerOfferP.innerText = '';

    // wagerAccepted = true;

    // if (wagerAccepted && opponentWagerAcceptedP) {
    //   enableChoiceButtons();
    //   disableWagerButtons();
    // }
  });

  offerWagerBtn.addEventListener('click', () => {
    var wagerValue = wagerInput.value;

    console.log(`wagerValue: ${wagerValue}`);

    socket.emit('offer_wager', { wager: wagerValue, address: accounts[0], game_id: gameId });

    offerWagerBtn.disabled = true;
    wagerInput.disabled = true;
    if (!wagerAccepted) {
      oppWagerStatusP.innerText = '';
    }
    oppWagerOfferP.innerText = '';
    yourWagerOfferP.innerText = `You offered a ${wagerValue} wager. Waiting for your opponent to accept your wager...`;
    yourWagerStatusP.innerText = '';
  });

  declineWagerBtn.addEventListener('click', () => {
    socket.emit('decline_wager', { address: accounts[0], game_id: gameId });
    offerWagerBtn.disabled = false;
    wagerInput.disabled = false;
    acceptWagerBtn.disabled = true;
    declineWagerBtn.disabled = true;
  });

  wagerInput.addEventListener('input', function () {
    if (this.value === '' || this.value === '0' || this.value === '$') {
      yourWagerPInEtherP.innerText = 'in eth: 0.00000';
      offerWagerBtn.disabled = true;
    } else {
      clearTimeout(timeout)
      this.value = this.value.replace(/^\$/, ''); // Remove $ if entered by the user
      this.value = `$${this.value}`; // Add $ at the starting of the string    
      const dollars = this.value;
      timeout = setTimeout(async () => {
        try {
          const result = await dollarsToEthereum(dollars.replace(/^\$/, ''));
          yourWagerPInEtherP.innerText = `in eth: ${result}`;
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

  choiceButtons.forEach((button) => {
    if (button.id === 'rock' || button.id === 'paper' || button.id === 'scissors') {
      button.addEventListener('click', (event) => {
        socket.emit('choice', {
          game_id: gameId,
          choice: button.id,
          address: accounts[0]
        });

        const choiceButtonsDiv = document.getElementById('buttons');
        choiceButtonsDiv.remove();

        const choice = button.id;
        console.log(`You chose ${choice}`);
        document.querySelector('#symbol-choice p').innerText = `YOU chose`;

        let playerChoiceP = document.createElement('p');
        playerChoiceP.innerText = `${button.id.toUpperCase()}`;

        const colors = {
          'rock': 'red',
          'paper': 'purple',
          'scissors': 'seagreen'
        }
        playerChoiceP.classList.add('xxx-large-peace-sans', colors[choice]);

        let symbolChoiceDiv = document.getElementById('symbol-choice');

        let opponentChoiceStatus = document.querySelector('#symbol-choice p.flashing');
        opponentChoiceStatus.innerText = 'Waiting for opponent to choose...';

        symbolChoiceDiv.insertBefore(playerChoiceP, opponentChoiceStatus);
      });
    }
  });
}

function registerSocketIOEventListeners() {
  socket.on('wager_offered', (data) => {
    oppWagerInDollars = data.wager;
    oppWagerOfferP.innerText = `You were offered a ${data.wager} wager.`;
    oppWagerStatusP.innerText = '';
    declineWagerBtn.disabled = false;
    acceptWagerBtn.disabled = false;
  });

  socket.on('wager_declined', (data) => {
    console.log(`Wager declined by opponent in game ${data.game_id}`)
    oppWagerOfferP.innerText = '';
    oppWagerStatusP.innerText = `Your opponent declined your wager.`;
    offerWagerBtn.disabled = false;
    wagerInput.disabled = false;
    acceptWagerBtn.disabled = true;
    declineWagerBtn.disabled = true;
  });

  socket.on('generating_contract', (data) => {
    joinContractStatusP.innerText = 'Generating contract...';
    console.log("Generating contract...");
  });

  socket.on('contract_created', (data) => {
    const contractAddress = data.contract_address;
    const yourWager = data.your_wager;
    const opponentWager = data.opponent_wager;

    console.log("Contract created...");
    joinContractStatusP.innerText = 'Contract created...';
    yourWagerP.innerText = `YOU wagered ${yourWager}`;
    opponentWagerP.innerText = `OPP wagered ${opponentWager}`;
    enableChoiceButtons();
    disableWagerButtons();

    // join the created RPS contract
    const stakeUSD = data.your_wager.replace(/^\$/, '');
    console.log(`Wager accepted by both parties. Joining RPSContract with address: ${contractAddress}`)
    console.log(`Stake in USD: ${stakeUSD}`);
    joinContract(parseFloat(stakeUSD), contractAddress);
  });

  socket.on('wager_accepted', (data) => {
    opponentWagerAcceptedP = true;
    oppWagerStatusP.innerText = '';
    oppWagerOfferP.innerText = '';
    yourWagerOfferP.innerText = '';
    yourWagerStatusP.innerText = `Your opponent accepted your wager.`;
    console.log(`data from wager_accepted event: ${JSON.stringify(data)}`);
  });

  socket.on('connect_error', (error) => {
    console.log(error);
  });

  socket.on('game_started', (data) => {
    gameId = data.game_id;
    gameIdP.innerText = `Game ID: ${gameId}`;
    opponentJoinP.innerText = '';
    oppWagerStatusP.innerText = 'You\'ve got an opponent! Try sending them a wager...';
    yourWagerP.innerText = '';
    yourWagerPInEtherP.innerText = 'in eth: 0.00000';
    wagerInput.value = '';
    yourWagerOfferP.innerText = '';
    yourWagerStatusP.innerText = '';
    oppWagerOfferP.innerText = '';
    wagerInput.disabled = false;
  });

  socket.on('opponent_disconnected', () => {
    opponentJoinP.innerText = `Your opponent disconnected. 
      Refresh the page to start a new game.`;
    opponentJoinP.classList.add('flashing');
    disableChoiceButtons();
    disableWagerButtons();
    // yourWagerOfferP.innerText = '';
    // yourWagerStatusP.innerText = '';
    // oppWagerOfferP.innerText = '';
    // oppWagerStatusP.innerText = '';
  });

  socket.on('you_win', (data) => {
    console.log(`You win! ${JSON.stringify(data)}`);
    yourChoiceP.innerText = `YOU chose ${data.your_choice.toUpperCase()}`;
    oppChoiceP.innerText = `OPP chose ${data.opp_choice.toUpperCase()}`;
    winLoseDrawP.innerText = 'You won';
    outcomeP.innerText = `YOU won $${data.winnings}`;

    disableChoiceButtons();
    disableWagerButtons();
  });

  socket.on('you_lose', (data) => {
    console.log(`You lose! ${JSON.stringify(data)}`);
    yourChoiceP.innerText = `YOU chose ${data.your_choice.toUpperCase()}`;
    oppChoiceP.innerText = `OPP chose ${data.opp_choice.toUpperCase()}`;
    winLoseDrawP.innerText = 'You lose!';
    outcomeP.innerText = `YOU lost $${data.losses}`;

    disableChoiceButtons();
    disableWagerButtons();
  });

  socket.on('draw', (data) => {
    console.log(`It was a draw! ${JSON.stringify(data)}`);
    yourChoiceP.innerText = `YOU chose ${data.your_choice.toUpperCase()}`;
    oppChoiceP.innerText = `OPP chose ${data.opp_choice.toUpperCase()}`;
    winLoseDrawP.innerText = 'It was a draw!';
    outcomeP.innerText = `You'll get back your wager minus gas and a small arbiter fee.`;

    disableChoiceButtons();
    disableWagerButtons();
  });

  socket.on('transaction_rejected', (data) => {
    console.error(`The transaction was rejected: ${data.error}`);
    joinContractStatusP.innerText = `Your opponent decided to reject the transaction. 
      If you have accepted the transaction, you will be refunded your wager minus gas fees. 
      If you have not, refresh the page to start a new game.`;
    joinContractStatusP.classList.remove('flashing');
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
  const stakeInWei = web3.utils.toWei(stakeInEther.toString(), 'wei');
  console.log(`The stake in Wei is ${stakeInWei}`);

  const encodedData = RPSContract.methods.joinContract().encodeABI();
  const transaction = {
    'from': web3.utils.toChecksumAddress(accounts[0]),
    'to': web3.utils.toChecksumAddress(contractAddress),
    'value': '0x' + web3.utils.toBigInt(stakeInWei).toString(16),
    'nonce': nonce,
    'gas': 500000,  // You may need to change the gas limit
    'gasPrice': gasPricePlusTwoPercent,
    'data': encodedData,
  };

  joinContractStatusP.innerText = 'Joining players to contract...';

  const txHash = web3.eth.sendTransaction(transaction);

  txHash.catch((err) => {
    console.error(`An error occurred: ${err}`);
    // emit an event to the server to let the other player know that the transaction failed
    socket.emit('transaction_rejected', {
      game_id: gameId,
      address: accounts[0],
      contract_address: contractAddress,
      error: err
    });

    joinContractStatusP.innerText = 'You decided to reject the transaction. Refresh the page to start a new game.';
    joinContractStatusP.classList.remove('flashing');
  });

  txHash.on('transactionHash', function (hash) {
    joinContractStatusP.innerText = 'Transaction hash received. Waiting for transaction to be mined...';
    // Transaction hash received
    console.log(`The transaction hash is ${hash}`);
    socket.emit('join_contract_transaction_hash_received', {
      game_id: gameId,
      transaction_hash: hash,
      address: accounts[0],
      contract_address: contractAddress,
    });
  });

  txHash.on('receipt', function (receipt) {
    joinContractStatusP.innerText = 'Transaction receipt received. Transaction mined, waiting for confirmation...';
    // Transaction receipt received
    console.log(`The receipt is ${receipt}`);
    // socket.emit('join_contract_transaction_receipt_received', {
    //   receipt: receipt
    // });
  });

  txHash.on('confirmation', function (confirmation, receipt) {
    joinContractStatusP.innerText = 'Transaction confirmed.';
    joinContractStatusP.classList.remove('flashing');
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

document.addEventListener('DOMContentLoaded', () => {
  choiceButtons = document.querySelectorAll('#buttons button');
  gameIdP = document.getElementById('game-id');
  playerId = document.getElementById('player-id');
  wagerInput = document.getElementById('wager-input');
  wagerInputPlaceholder = wagerInput.placeholder;
  yourWagerPInEtherP = document.getElementById('your-wager-in-ether');
  wagerButtons = document.getElementById('wager-buttons');
  acceptWagerBtn = document.getElementById('accept-wager');
  declineWagerBtn = document.getElementById('decline-wager');
  opponentJoinP = document.getElementById('opp-join');
  oppWagerInEtherP = document.getElementById('opp-wager-in-ether');
  yourWagerP = document.getElementById('your-wager');
  oppWagerP = document.getElementById('opp-wager');
  acceptedWagerStatusP = document.getElementById('accepted-wager-status');
  resultsDiv = document.getElementById('resultsDiv');
  winLoseDrawP = document.getElementById('win-lose-draw');
  yourChoiceP = document.getElementById('your-choice');
  oppChoiceP = document.getElementById('opp-choice');
  outcomeP = document.getElementById('outcomeP');
  rockBtn = document.getElementById('rock');
  paperBtn = document.getElementById('paper');
  scissorsBtn = document.getElementById('scissors');
  offerWagerBtn = document.getElementById('offer-wager');
  opponentWagerP = document.getElementById('opponent-wager');
  yourWagerOfferP = document.getElementById('your-wager-offer');
  yourWagerStatusP = document.getElementById('your-wager-status');
  oppWagerOfferP = document.getElementById('opp-wager-offer');
  oppWagerStatusP = document.getElementById('opp-wager-status');
  joinContractStatusP = document.getElementById('join-contract-status');

  (async () => {
    while (!window.ethereum) {
      console.log('Waiting for MetaMask...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    web3 = new Web3(window.ethereum);

    // Request access to user's MetaMask accounts
    // await window.ethereum.request({ method: 'eth_requestAccounts' })

    // Use web3.js
    accounts = await web3.eth.getAccounts();
    console.log(`Your accounts: ${accounts}`);

    socket = io('http://24.144.112.170:8000', { transports: ['websocket'] });
    socket = io('https://dev.generalsolutions43.com',
      {
        transports: ['websocket'],
        query: {
          address: accounts[0]
        }
      });

    registerDOMEventListeners();
    registerSocketIOEventListeners();
  })();
});