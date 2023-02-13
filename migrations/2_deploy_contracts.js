var SecureVoting = artifacts.require("../contracts/SecureVoting.sol")

module.exports = function(deployer) {
  deployer.deploy(SecureVoting)
}