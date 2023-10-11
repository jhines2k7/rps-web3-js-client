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
let yourWagerInEtherP;
let oppWagerStatusP;
let yourWagerStatusP;
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
    (async () => {
      const oppWagerInEth = await dollarsToEthereum(oppWagerInDollars.replace(/^\$/, ''));
      oppWagerInEtherP.innerText = `Your opponent wager in eth: ${oppWagerInEth}`;
      socket.emit('accept_wager', { address: accounts[0], opp_wager_in_eth: oppWagerInEth, game_id: gameId });
    })();
    acceptWagerBtn.disabled = true;
    declineWagerBtn.disabled = true;

    opponentJoinP.innerText = '';
    oppWagerStatusP.innerText = `You accepted a ${oppWagerInDollars} wager from your opponent.`;
  });

  offerWagerBtn.addEventListener('click', () => {
    let wagerValue = wagerInput.value;

    console.log(`wagerValue: ${wagerValue}`);

    socket.emit('offer_wager', { wager: wagerValue, address: accounts[0], game_id: gameId });

    opponentJoinP.innerText = '';
    offerWagerBtn.disabled = true;
    wagerInput.disabled = true;
    yourWagerStatusP.innerText = `You offered a ${wagerValue} wager. Waiting for your opponent to accept your wager...`;
    // oppWagerStatusP.innerText = '';
  });

  declineWagerBtn.addEventListener('click', () => {
    socket.emit('decline_wager', { address: accounts[0], game_id: gameId });
    offerWagerBtn.disabled = false;
    wagerInput.disabled = false;
    acceptWagerBtn.disabled = true;
    declineWagerBtn.disabled = true;
    opponentJoinP.innerText = '';
    oppWagerStatusP.innerText = `You declined the ${oppWagerInDollars} wager from your opponent.`;
  });

  wagerInput.addEventListener('input', function () {
    if (this.value === '' || this.value === '0' || this.value === '$') {
      yourWagerInEtherP.innerText = 'in eth: 0.00000';
      offerWagerBtn.disabled = true;
    } else {
      clearTimeout(timeout)
      this.value = this.value.replace(/^\$/, ''); // Remove $ if entered by the user
      this.value = `$${this.value}`; // Add $ at the beginning of the string    
      const dollars = this.value;
      timeout = setTimeout(async () => {
        try {
          const result = await dollarsToEthereum(dollars.replace(/^\$/, ''));
          yourWagerInEtherP.innerText = `Your wager in eth: ${result}`;
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
    oppWagerStatusP.innerText = `You were offered a ${data.wager} wager.`;
    declineWagerBtn.disabled = false;
    acceptWagerBtn.disabled = false;
    opponentJoinP.innerText = '';
  });

  socket.on('wager_declined', (data) => {
    console.log(`Wager declined by opponent in game ${data.game_id}`)
    yourWagerStatusP.innerText = '';
    oppWagerStatusP.innerText = 'Your opponent declined your wager. Try to offer a different amount.';
    offerWagerBtn.disabled = false;
    wagerInput.disabled = false;
    acceptWagerBtn.disabled = true;
    declineWagerBtn.disabled = true;
    opponentJoinP.innerText = '';
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
    yourWagerStatusP.innerText = `Your opponent accepted your wager.`;
    console.log(`data from wager_accepted event: ${JSON.stringify(data)}`);
    opponentJoinP.innerText = '';
  });

  socket.on('connect_error', (error) => {
    console.log(error);
  });

  socket.on('game_started', (data) => {
    gameId = data.game_id;
    gameIdP.innerText = `Game ID: ${gameId}`;
    opponentJoinP.innerText = 'You\'ve got an opponent! Try sending them a wager...';
    oppWagerStatusP.innerText = 'Waiting for your opponent to send you a wager...';
    yourWagerP.innerText = '';
    yourWagerInEtherP.innerText = 'in eth: 0.00000';
    wagerInput.value = '';
    yourWagerStatusP.innerText = '';
    wagerInput.disabled = false;
  });

  socket.on('opponent_disconnected', () => {
    opponentJoinP.innerText = `Your opponent disconnected. Refresh to start a new game.`;
    opponentJoinP.classList.add('flashing');
    wagerInput.disabled = true;
    oppWagerStatusP.innerText = '';
    yourWagerInEtherP.innerText = '';
    disableWagerButtons();
  });

  socket.on('you_win', (data) => {
    console.log(`You win! ${JSON.stringify(data)}`);
    let oppChoseP = document.createElement('p');
    oppChoseP.innerText = `OPP chose`;
    let oppChoiceP = document.createElement('p');
    oppChoiceP.innerText = `${data.opp_choice.toUpperCase()}`;

    const colors = {
      'rock': 'red',
      'paper': 'purple',
      'scissors': 'seagreen'
    }
    oppChoiceP.classList.add('xxx-large-peace-sans', colors[data.opp_choice]);

    let symbolChoiceDiv = document.getElementById('symbol-choice');

    let opponentChoiceStatus = document.querySelector('#symbol-choice p.flashing');
    opponentChoiceStatus.innerText = '';

    symbolChoiceDiv.insertBefore(oppChoseP, opponentChoiceStatus);
    symbolChoiceDiv.insertBefore(oppChoiceP, opponentChoiceStatus);

    winLoseDrawP.innerText = 'You win!';
    outcomeP.innerText = `YOU won ${data.winnings}`;

    (async () => {
      const winningsInEth = await dollarsToEthereum(data.winnings.replace(/^\$/, ''));
      let winningsInEthP = document.createElement('p');
      winningsInEthP.innerText = `You won ${winningsInEth} eth`;
      resultsDiv.appendChild(winningsInEthP);
    })();

    disableWagerButtons();
  });

  socket.on('you_lose', (data) => {
    console.log(`You lose! ${JSON.stringify(data)}`);
    let oppChoseP = document.createElement('p');
    oppChoseP.innerText = `OPP chose`;
    let oppChoiceP = document.createElement('p');
    oppChoiceP.innerText = `${data.opp_choice.toUpperCase()}`;

    const colors = {
      'rock': 'red',
      'paper': 'purple',
      'scissors': 'seagreen'
    }
    oppChoiceP.classList.add('xxx-large-peace-sans', colors[data.opp_choice]);

    let symbolChoiceDiv = document.getElementById('symbol-choice');

    let opponentChoiceStatus = document.querySelector('#symbol-choice p.flashing');
    opponentChoiceStatus.innerText = '';

    symbolChoiceDiv.insertBefore(oppChoseP, opponentChoiceStatus);
    symbolChoiceDiv.insertBefore(oppChoiceP, opponentChoiceStatus);

    winLoseDrawP.innerText = 'You lose!';
    outcomeP.innerText = `YOU lost ${data.losses}`;

    (async () => {
      const lossesInEth = await dollarsToEthereum(data.losses.replace(/^\$/, ''));
      let lossesInEthP = document.createElement('p');
      lossesInEthP.innerText = `You lost ${lossesInEth} eth`;
      resultsDiv.appendChild(lossesInEthP);
    })();

    disableWagerButtons();
  });

  socket.on('draw', (data) => {
    console.log(`It was a draw! ${JSON.stringify(data)}`);
    winLoseDrawP.innerText = 'It was a draw!';

    let oppChoseP = document.createElement('p');
    oppChoseP.innerText = `OPP chose`;
    let oppChoiceP = document.createElement('p');
    oppChoiceP.innerText = `${data.opp_choice.toUpperCase()}`;

    const colors = {
      'rock': 'red',
      'paper': 'purple',
      'scissors': 'seagreen'
    }
    oppChoiceP.classList.add('xxx-large-peace-sans', colors[data.opp_choice]);

    let symbolChoiceDiv = document.getElementById('symbol-choice');

    let opponentChoiceStatus = document.querySelector('#symbol-choice p.flashing');
    opponentChoiceStatus.innerText = '';

    symbolChoiceDiv.insertBefore(oppChoseP, opponentChoiceStatus);
    symbolChoiceDiv.insertBefore(oppChoiceP, opponentChoiceStatus);

    winLoseDrawP.innerText = 'DRAW!';
    outcomeP.classList.add('draw');
    outcomeP.innerText = "You'll get back your wager minus a small arbiter fee and gas fees.";

    disableWagerButtons();
  });

  socket.on('player_stake_refunded', (data) => {
    const reason = data.reason;

    let wagerRefundStatusP = document.getElementById('wager-refund-status');

    if (reason === 'insufficient_funds') {
      console.error(`Opponent insufficient funds: ${data.transaction_hash}`);
      wagerRefundStatusP.innerText = 'Your opponent didn\'t have the funds to join the contract. You will be refunded your wager minus gas fees. Refresh to start a new game.';
    } else {
      console.error(`Your opponent decided not to join the contract: ${data.transaction_hash}`);
      wagerRefundStatusP.innerText = 'Your opponent decided not to join the contract. You will be refunded your wager minus gas fees. Refresh to start a new game.';
    }

    joinContractStatusP.innerText = '';
    joinContractStatusP.classList.remove('flashing');

    let gameSection = document.getElementById('game-section');
    gameSection.remove()
  });

  socket.on('heartbeat_response', (data) => {
    console.log(`Heartbeat received: ${JSON.stringify(data)}`);
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

async function loadContractABI() {
  return fetch("https://dev.generalsolutions43.com/rps-contract-abi")
    .then(response => response.json())
    .then(data => {
      // Use the loaded JSON data here
      console.log(`The RPSContract ABI is ${data.abi}`)
      return data;
    })
    .catch(error => {
      // Handle any potential errors
      console.error(`Error: ${error}`);
    });
}

async function joinContract(stakeUSD, contractAddress) {
  // Fetch the RPSContract
  const rpsContractABI = await loadContractABI();
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
  const stakeInWei = web3.utils.toWei(stakeInEther.toString(), 'ether');
  console.log(`The stake in Wei is ${stakeInWei}`);

  const encodedData = RPSContract.methods.joinContract(gameId).encodeABI();
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

  txHash.catch((error) => {
    if (error.innerError.code === 4001) {
      console.error(error.innerError.message);
      // emit an event to the server to let the other player know you rejected the transaction
      socket.emit('contract_rejected', {
        game_id: gameId,
        address: accounts[0],
        contract_address: contractAddress,
        error: error
      });

      joinContractStatusP.innerText = "You decided not to accept the contract. Your opponent has been notified. Refresh to start a new game.";
      joinContractStatusP.classList.remove('flashing');
    }

    if (error.innerError.code === -32000) {
      console.error(error.innerError.message);

      socket.emit('insufficient_funds', {
        game_id: gameId,
        address: accounts[0],
        contract_address: contractAddress,
        error: error
      });

      joinContractStatusP.innerText = "Check your account balance. Metamask thinks you have insufficient funds. This is sometimes due to the way Metamask calculates ether. We've notified your opponent. Refresh to start a new game.";
      joinContractStatusP.style.color = 'red';
      joinContractStatusP.classList.remove('flashing');
    }
  });

  txHash.on('transactionHash', function (hash) {
    joinContractStatusP.innerText = 'Transaction hash received. Waiting for transaction to be mined...';
    // Transaction hash received
    console.log(`The transaction hash is ${hash}`);
    socket.emit('join_contract_hash', {
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
    socket.emit('join_contract_receipt', {
      game_id: gameId,
      address: accounts[0],
      contract_address: contractAddress,
    });
  });

  txHash.on('confirmation', function (confirmation, receipt) {
    joinContractStatusP.innerText = 'Transaction confirmed.';
    joinContractStatusP.classList.remove('flashing');
    // Transaction confirmed
    console.log(`The confirmation number is ${confirmation}`);
    socket.emit('join_contract_confirmation', {
      game_id: gameId,
      address: accounts[0],
      contract_address: contractAddress,
      // confirmation: confirmation 
    });
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
  yourWagerInEtherP = document.getElementById('your-wager-in-ether');
  wagerButtons = document.getElementById('wager-buttons');
  acceptWagerBtn = document.getElementById('accept-wager');
  declineWagerBtn = document.getElementById('decline-wager');
  opponentJoinP = document.getElementById('opp-join');
  oppWagerInEtherP = document.getElementById('opp-wager-in-ether');
  yourWagerP = document.getElementById('your-wager');
  oppWagerP = document.getElementById('opp-wager');
  acceptedWagerStatusP = document.getElementById('accepted-wager-status');
  resultsDiv = document.getElementById('results');
  winLoseDrawP = document.getElementById('win-lose-draw');
  yourChoiceP = document.getElementById('your-choice');
  outcomeP = document.getElementById('outcome');
  rockBtn = document.getElementById('rock');
  paperBtn = document.getElementById('paper');
  scissorsBtn = document.getElementById('scissors');
  offerWagerBtn = document.getElementById('offer-wager');
  opponentWagerP = document.getElementById('opponent-wager');
  yourWagerStatusP = document.getElementById('your-wager-status');
  oppWagerStatusP = document.getElementById('opp-wager-status');
  joinContractStatusP = document.getElementById('join-contract-status');

  (async () => {
    while (!window.ethereum) {
      console.log('Waiting for MetaMask...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Request access to user's MetaMask accounts
    await window.ethereum.request({ method: 'eth_requestAccounts' })

    // Use web3.js
    accounts = await web3.eth.getAccounts();

    console.log(`Your accounts: ${accounts}`);
  })();

  socket = io('https://dev.generalsolutions43.com',
    {
      transports: ['websocket'],
      query: {
        address: accounts[0]
      }
    });

  registerDOMEventListeners();
  registerSocketIOEventListeners();

  web3 = new Web3(window.ethereum);

  setInterval(function () {
    socket.emit('heartbeat', { address: accounts[0], ping: 'ping' })
  }, 5000); // Send heartbeat every 10 seconds
});