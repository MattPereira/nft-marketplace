import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "BasicNft" using the deployer account
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployBasicNft: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  //   const chainId = network.config.chainId;
  const chainId = await hre.ethers.provider.getNetwork().then(network => network.chainId);
  console.log(`The current chain ID is: ${chainId}`);

  log("------------------------------------");

  const args: string[] = [];
  await deploy("BasicNft", {
    from: deployer,
    // Contract constructor arguments
    args: args,
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // * HOW TO VERIFY : https://docs.scaffoldeth.io/deploying/deploy-smart-contracts#4-verify-your-smart-contract
};

export default deployBasicNft;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployBasicNft.tags = ["basic", "all"];
