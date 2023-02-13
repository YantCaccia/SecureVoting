const modalAvvisi = new bootstrap.Modal('#modalAvvisi');
const addCandidateModal = new bootstrap.Modal('#addCandidateModal');

const App = {

  web3Provider: null,
  contracts: {},
  account: null,

  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {

    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    web3.eth.getAccounts(async function (error, accounts) {
      if (error) {
        console.log(error);
      }
      App.account = accounts[0];
    });

    return App.initContract();

  },

  initContract: function () {

    $.getJSON('SecureVoting.json', async function (data) {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      var SecureVotingArtifact = data;
      App.contracts.SecureVoting = await TruffleContract(SecureVotingArtifact);

      // Set the provider for our contract
      await App.contracts.SecureVoting.setProvider(App.web3Provider);

      App.getCandidates().then(candidates => {
        App.pupulateTable(candidates);
        App.checkIfContractCreator();
      });


    });

  },

  pupulateTable: function (candidates) {

    const candidatesTableBody = $('#candidatesTableBody');

    for (const candidate of candidates) {

      const nameCell = $('<td/>').html(candidate.name).css('vertical-align', 'middle');
      const partyCell = $('<td/>').html(candidate.party).css('vertical-align', 'middle');
      const votesCell = $('<td/>').html(candidate.votes).attr('class', 'show-if-admin').css('vertical-align', 'middle');
      const actionCell = $('<td/>')
        .css('vertical-align', 'middle')
        .html(
          $('<button/>')
            .attr('class', 'btn btn-success btn-adopt')
            .attr('type', 'button')
            .html('<i class="bi bi-check-circle-fill"></i> Votami!')
            .attr('data-candidateid', candidate.uid)
        );

      const newRow = $('<tr/>').append(nameCell, partyCell, votesCell, actionCell);

      candidatesTableBody.append(newRow);

    }

    App.bindEvents();

  },

  bindEvents: function () {
    $(document).on('click', '.btn-adopt', App.handleVote);
    $('#addCandidateForm').on('submit', App.handleAddCandidate);
    $(document).on('click', '#dismissModalAvvisi', App.hideAlertModal);
  },

  handleAddCandidate: function (event) {

    event.preventDefault();

    addCandidateModal.hide();

    let nomeCandidato = $('#nomeCandidatoModal').val();
    let partitoCandidato = $('#partitoCandidatoModal').val();

    App.contracts.SecureVoting.deployed().then(function (instance) {
      return instance.addCandidate(nomeCandidato, partitoCandidato, { from: App.account });
    }).then(function (result) {
      App.showAlertModal('Hai aggiunto un candidato!');
    }).catch(function (err) {
      console.log(err.message);
    });

  },

  handleVote: function (event) {

    event.preventDefault();

    let candidateId = parseInt($(event.target).data('candidateid'));
    App.voteCandidate(candidateId);

  },

  voteCandidate: async function (candidateId) {

    if (await App.checkHasAlreadyVoted()) {
      App.showAlertModal('Hai già votato');
    } else {

      App.contracts.SecureVoting.deployed().then(function (instance) {
        return instance.vote(App.account, candidateId, { from: App.account });
      }).then(function (result) {
        App.showAlertModal('Hai votato!')
      }).catch(function (err) {
        console.log(err.message);
      });

    }

  },

  getCandidates: async function () {

    return new Promise((resolve) => {
      App.contracts.SecureVoting.deployed().then(function (instance) {
        resolve(instance.getCandidates.call());
      }).catch(function (err) {
        console.log(err.message);
      });
    });

  },

  checkHasAlreadyVoted: function () {

    return new Promise(resolve => {
      App.contracts.SecureVoting.deployed().then(function (instance) {
        resolve(instance.hasAlreadyVoted.call({from: App.account}));
      }).catch(function (err) {
        console.log(err.message);
      });
    });

  },

  checkIfContractCreator: function () {
    App.contracts.SecureVoting.deployed().then(function (instance) {
      return instance.isOwner.call({from: App.account});
    }).then(function (isOwner) {
      if (isOwner) {
        $('.show-if-admin').show();
      } else {
        $('.show-if-admin').hide();
      }
    }).catch(function (err) {
      console.log(err.message);
    })
    // if (App.account.toLocaleLowerCase() == '0x7cb3139f3e40d335efb17ab0081e18885be58265') {
    //   $('.show-if-admin').show();
    // } else {
    //   $('.show-if-admin').hide();
    // }
  },

  showAlertModal: function (text) {
    $('#textAvviso').html(text);
    modalAvvisi.show();
  },

  hideAlertModal: function () {
    modalAvvisi.hide();
    window.location.reload();
  }

};

$(function () {
  $(window).on('load', function () {
    App.init();
    window.ethereum.on('accountsChanged', function (accounts) {
      App.account = accounts[0];
      App.checkIfContractCreator();
    })
  });
});
