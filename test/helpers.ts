import { ethers } from "hardhat";
import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";


export type Bid = { price: number, timestamp: number }
export const day = 24 * 60 * 60;

/**
 * Verify that the input array of numbers is sorted in descending order 
 * @param arr an array of numbers
 * @returns if the array is sorted in descending order
 */
export const isSortedDescending = (arr: number[]) => {
    for(let i = 1; i < arr.length; i++) {
        if (arr[i-1] < arr[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Increases the time of the test blockchain by the given number of seconds
 * @param secs the number of seconds to wait
 */
export const waitSeconds = async  (secs: number) => {
	const ts = (await time.latest()) + secs
	await time.increaseTo(ts)
}

/**
 * Converts from wei to units.
 * @param amount the amount in wei to convert in units
 * @returns the amount in units as a number
 */
export const toUnits = (amount: BigNumber) : number => {
    return Number(ethers.utils.formatUnits(amount, 18));
}

/**
 * Converts from units to wei.
 * @param units the amount of units to convert in wei
 * @returns the unit value in wei as a BigNumber
 */
export const toWei = (units: number) : BigNumber => {
    return ethers.utils.parseUnits( units.toString(), 18); 
}

/**
 * 
 * @returns the timestamp of the last mined block.
 */
export const getLastBlockTimestamp = async () => {
    return (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
}

/**
 * 
 * @returns an object containing an instance of the TokenAuction contract, 
 *  TokenAuction contract, the contract owner and a user
 */
export const deployAuctionContract = async () => {

    const [ owner, user ] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken")
    const testToken = await TestToken.deploy(toWei(1_000_000))

    const TokenAuction = await ethers.getContractFactory("TokenAuction")
    const tokenAuction = await TokenAuction.deploy(
        testToken.address, 
    )

    await tokenAuction.deployed()

    return { testToken, tokenAuction, owner, user };
}

/**
 * Approves the token transfer and starts a new auction.
 * @param tokenAuction the TokenAuction Contract
 * @param testToken the TestToken Contract
 * @param amount the amount of tokens being auctioned as a BigNumber
 * @param duration the duration of the auction in seconds
 */
export const startAuction = async (tokenAuction: Contract, testToken: Contract, amount: BigNumber, duration: number) => {
    await testToken.approve(tokenAuction.address, amount);
    await tokenAuction.startAuction(amount, duration);
}


/**
 * 
 * @param tokenAuction the TokenAuction contract
 * @param user the account that is submitting the bid
 * @param amount the amount of the token to bid for
 * @param prices the array of prices for the bids to submit, in wei
 * @returns an array of Bid objects containing the price and timestamp of all bids stored in the contract
 */
export const submitBids = async (
        tokenAuction: Contract, 
        users: SignerWithAddress[], 
        amounts: BigNumber[], 
        prices: number[]
    ) => {

    for (const [index, user] of users.entries()) {
        const amount = amounts[index % amounts.length]
        const price = prices[index % prices.length]

        await tokenAuction.connect(user).bid(amount, toWei(price))
    }

    const bids : Bid[] = (await tokenAuction.getAllBids()).map( 
        (it : { price: BigNumber, timestamp: BigNumber }) => { 
            return {
                price: toUnits(it.price),
                timestamp: it.timestamp.toNumber(),
            }
        }
    );

    return bids;
}
