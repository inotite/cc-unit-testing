import { ethers } from "hardhat"

async function main() {
  const MilkFactory = await ethers.getContractFactory("Milk")
  const milk = await MilkFactory.deploy("Milk", "MLK")
  await milk.deployed()

  console.log("Milk deployed to:", milk.address)

  const ItemFactory = await ethers.getContractFactory("ItemFactory")
  const itemFactory = await ItemFactory.deploy(
    "https://clonex-assets.rtfkt.com/",
    milk.address
  )
  await itemFactory.deployed()

  console.log("ItemFactory deployed to:", itemFactory.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
