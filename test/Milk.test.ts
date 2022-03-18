import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { ethers } from "hardhat"
import { Milk } from "typechain"
import { CONTRACT_ROLE, DEPOSITOR_ROLE, MASTER_ROLE } from "./utils"

const { utils } = ethers

describe("Milk contract", () => {
  let milk: Milk
  let owner: SignerWithAddress
  let master: SignerWithAddress
  let contract: SignerWithAddress
  let depositor: SignerWithAddress
  let user: SignerWithAddress
  let toUser: SignerWithAddress

  beforeEach(async () => {
    const MilkFactory = await ethers.getContractFactory("Milk")
    milk = await MilkFactory.deploy("Milk", "MLK")
    await milk.deployed()
    ;[owner, master, contract, depositor, user, toUser] =
      await ethers.getSigners()

    await milk.grantRole(MASTER_ROLE, master.address)
    await milk.grantRole(CONTRACT_ROLE, contract.address)
    await milk.grantRole(DEPOSITOR_ROLE, depositor.address)
  })

  it("should have specified Name and Symbol", async () => {
    const name = await milk.name()
    const symbol = await milk.symbol()

    expect(name).to.equal("Milk")
    expect(symbol).to.equal("MLK")
  })

  describe("deposit()", () => {
    it("should only allow deposit if the user has DEPOSITOR role", async () => {
      const amount = utils.defaultAbiCoder.encode(["uint"], [100])
      await expect(
        milk.connect(contract).deposit(user.address, amount)
      ).to.revertedWith("AccessControl: account")
    })

    it("should deposit exact amount to the specified user", async () => {
      const amount = utils.defaultAbiCoder.encode(["uint"], [100])
      await expect(milk.connect(depositor).deposit(user.address, amount))
        .to.emit(milk, "Transfer")
        .withArgs(ethers.constants.AddressZero, user.address, 100)

      const balance = await milk.balanceOf(user.address)
      expect(balance).to.equal(100)
    })
  })

  describe("withdraw()", () => {
    beforeEach(async () => {
      const amount = utils.defaultAbiCoder.encode(["uint"], [100])
      await milk.connect(depositor).deposit(user.address, amount)
    })

    it("should allow withdrawal with lower or equal amount of balance", async () => {
      await expect(milk.connect(user).withdraw(200)).to.revertedWith(
        "ERC20: burn amount exceeds balance"
      )
    })

    it("should withdraw specified amount", async () => {
      await milk.connect(user).withdraw(80)

      const balance = await milk.balanceOf(user.address)
      expect(balance).to.equal(20)
    })
  })

  describe("gameWithdraw()", () => {
    beforeEach(async () => {
      const amount = utils.defaultAbiCoder.encode(["uint"], [100])
      await milk.connect(depositor).deposit(user.address, amount)
    })

    it("should only allow withdrawal for CONTRACT role", async () => {
      await expect(
        milk.connect(depositor).gameWithdraw(user.address, 100)
      ).to.revertedWith("AccessControl: account")
    })

    it("should allow withdrawal with lower or equal amount of balance", async () => {
      await expect(
        milk.connect(contract).gameWithdraw(user.address, 200)
      ).to.revertedWith("ERC20: burn amount exceeds balance")
    })

    it("should withdraw specified amount", async () => {
      await milk.connect(contract).gameWithdraw(user.address, 80)

      const balance = await milk.balanceOf(user.address)
      expect(balance).to.equal(20)
    })
  })

  describe("gameTransferFrom()", () => {
    const BALANCE = 100

    beforeEach(async () => {
      const amount = utils.defaultAbiCoder.encode(["uint"], [BALANCE])
      await milk.connect(depositor).deposit(user.address, amount)
    })

    it("should only allow transfer for CONTRACT role", async () => {
      await expect(
        milk
          .connect(depositor)
          .gameTransferFrom(user.address, toUser.address, BALANCE)
      ).to.revertedWith("AccessControl: account")
    })

    it("should allow transfer with lower or equal amount of balance", async () => {
      await expect(
        milk
          .connect(contract)
          .gameTransferFrom(user.address, toUser.address, 200)
      ).to.revertedWith("ERC20: transfer amount exceeds balance")
    })

    it("should transfer specified amount", async () => {
      const amountToTransfer = 80
      await milk
        .connect(contract)
        .gameTransferFrom(user.address, toUser.address, amountToTransfer)

      const balance = await milk.balanceOf(user.address)
      expect(balance).to.equal(BALANCE - amountToTransfer)

      const recipientBalance = await milk.balanceOf(toUser.address)
      expect(recipientBalance).to.equal(amountToTransfer)
    })
  })

  describe("gameBurn()", () => {
    const BALANCE = 100

    beforeEach(async () => {
      const amount = utils.defaultAbiCoder.encode(["uint"], [BALANCE])
      await milk.connect(depositor).deposit(user.address, amount)
    })

    it("should allow burn for CONTRACT role", async () => {
      await expect(
        milk.connect(depositor).gameBurn(user.address, BALANCE)
      ).to.revertedWith("AccessControl: account")
    })

    it("should allow burn with lower or equal amount of balance", async () => {
      await expect(
        milk.connect(contract).gameBurn(user.address, 200)
      ).to.revertedWith("ERC20: transfer amount exceeds balance")
    })

    it("should burn specified amount", async () => {
      const amountToTransfer = 80
      await expect(
        milk.connect(contract).gameBurn(user.address, amountToTransfer)
      )
        .to.emit(milk, "Transfer")
        .withArgs(user.address, milk.address, amountToTransfer)
        .emit(milk, "Transfer")
        .withArgs(milk.address, ethers.constants.AddressZero, amountToTransfer)

      const balance = await milk.balanceOf(user.address)
      expect(balance).to.equal(BALANCE - amountToTransfer)
    })
  })

  describe("gameMint()", () => {
    it("should not allow mint for general role", async () => {
      await expect(
        milk.connect(depositor).gameMint(user.address, 100)
      ).to.revertedWith("AccessControl: account")
    })

    it("should mint specified amount with CONTRACT role", async () => {
      const amountToMint = 100
      await expect(milk.connect(contract).gameMint(user.address, amountToMint))
        .to.emit(milk, "Transfer")
        .withArgs(ethers.constants.AddressZero, user.address, amountToMint)

      const balance = await milk.balanceOf(user.address)
      expect(balance).to.equal(amountToMint)
    })
  })

  describe("mint()", () => {
    it("should not allow mint for general role", async () => {
      await expect(
        milk.connect(contract).mint(user.address, 100)
      ).to.revertedWith("AccessControl: account")
    })

    it("should mint specified amount with MASTER role", async () => {
      const amountToMint = 100
      await expect(milk.connect(master).mint(user.address, amountToMint))
        .to.emit(milk, "Transfer")
        .withArgs(ethers.constants.AddressZero, user.address, amountToMint)

      const balance = await milk.balanceOf(user.address)
      expect(balance).to.equal(amountToMint)
    })
  })
})
