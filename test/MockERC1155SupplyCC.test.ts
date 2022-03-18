import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { ethers } from "hardhat"
import { MockERC1155SupplyCC } from "typechain"

describe("ERC1155SupplyCC", () => {
  let cc: MockERC1155SupplyCC
  let owner: SignerWithAddress
  let user: SignerWithAddress

  beforeEach(async () => {
    const MockContractFactory = await ethers.getContractFactory(
      "MockERC1155SupplyCC"
    )
    cc = await MockContractFactory.deploy()
    await cc.deployed()
    ;[owner, user] = await ethers.getSigners()
  })

  describe("totalSupply()", () => {
    it("should get total supply correctly when mint", async () => {
      const firstMintAmount = 2
      const secondMintAmount = 100

      await cc.mint(firstMintAmount)
      await cc.connect(user).mint(secondMintAmount)

      const firstSupply = await cc.totalSupply(0)
      const secondSupply = await cc.totalSupply(1)

      expect(firstSupply).to.equal(firstMintAmount)
      expect(secondSupply).to.equal(secondMintAmount)
    })

    it("shoud get total supply correctly after burn", async () => {
      const mintAmount = 100
      await cc.connect(user).mint(mintAmount)
      const firstSupply = await cc.totalSupply(0)
      expect(firstSupply).to.equal(mintAmount)

      const burnAmount = 20
      await cc.connect(user).burn(0, burnAmount)
      const afterBurnSupply = await cc.totalSupply(0)
      expect(afterBurnSupply).to.equal(mintAmount - burnAmount)
    })
  })

  it("should return existence of token correctly", async () => {
    await cc.mint(100)
    await cc.mint(20)
    await cc.mint(30)

    await cc.burn(0, 20)
    await cc.burn(1, 20)
    await cc.burn(2, 29)

    const firstTokenExistence = await cc.exists(0)
    const secondTokenExistence = await cc.exists(1)
    const thirdTokenExistence = await cc.exists(2)

    expect(firstTokenExistence).to.equal(true)
    expect(secondTokenExistence).to.equal(false)
    expect(thirdTokenExistence).to.equal(true)
  })
})
