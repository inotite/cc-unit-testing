import { ethers } from "hardhat"
const { utils } = ethers

export const DEPOSITOR_ROLE = utils.keccak256(
  utils.toUtf8Bytes("DEPOSITOR_ROLE")
)
export const CONTRACT_ROLE = utils.keccak256(utils.toUtf8Bytes("CONTRACT_ROLE"))
export const MASTER_ROLE = utils.keccak256(utils.toUtf8Bytes("MASTER_ROLE"))
