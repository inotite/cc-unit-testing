import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { ethers } from "hardhat"
import { ItemFactory, Milk } from "typechain"
import { CONTRACT_ROLE } from "./utils"

const { utils } = ethers

const ADMIN_ROLE = utils.keccak256(utils.toUtf8Bytes("ADMIN_ROLE"))

enum RewardType {
  ITEMS,
  MILK,
  BOX,
}

enum RewardRarity {
  COMMON,
  UNCOMMON,
  RARE,
  EPIC,
  LEGENDARY,
}

const INTERFACE_ID_MAP = {
  ERC165: "0x01ffc9a7",
  ERC1155: "0xd9b67a26",
}

const makeRewardCallData = (min: number, max: number, ids: number[]) => {
  return utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "uint256[]"],
    [min, max, ids]
  )
}

describe("ItemFactory contract", () => {
  let milk: Milk
  let itemFactory: ItemFactory
  let owner: SignerWithAddress
  let admin: SignerWithAddress
  let user: SignerWithAddress

  beforeEach(async () => {
    const MilkFactory = await ethers.getContractFactory("Milk")
    milk = await MilkFactory.deploy("Milk", "MLK")
    await milk.deployed()

    const ItemFactory = await ethers.getContractFactory("ItemFactory")
    itemFactory = await ItemFactory.deploy(
      "https://clonex-assets.rtfkt.com/",
      milk.address
    )
    await itemFactory.deployed()
    ;[owner, admin, user] = await ethers.getSigners()

    await itemFactory.grantRole(ADMIN_ROLE, admin.address)
    // Grant ItemFactory contract CONTRACT_ROLE
    await milk.grantRole(CONTRACT_ROLE, itemFactory.address)
  })

  it("should initialize Milk contract correctly", async () => {
    const milkAddress = await itemFactory._milkContractAddress()

    expect(milkAddress).to.equal(milk.address)
  })

  describe("setRarityRolls()", () => {
    it("should only allow ADMIN role", async () => {
      await expect(
        itemFactory.setRarityRolls(60, 80, 90, 98, 100, 110)
      ).to.revertedWith("AccessControl: account")
    })

    it("should revert if `common` is equal or greater than `uncommon`", async () => {
      await expect(
        itemFactory.connect(admin).setRarityRolls(80, 80, 90, 98, 100, 110)
      ).to.revertedWith("Common must be less rare than uncommon")
    })

    it("should revert if `uncommon` is equal or greater than `rare`", async () => {
      await expect(
        itemFactory.connect(admin).setRarityRolls(60, 91, 90, 98, 100, 110)
      ).to.revertedWith("Uncommon must be less rare than rare")
    })

    it("should revert if `rare` is equal or greater than `epic`", async () => {
      await expect(
        itemFactory.connect(admin).setRarityRolls(60, 80, 96, 95, 100, 110)
      ).to.revertedWith("Rare must be less rare than epic")
    })

    it("should revert if `epic` is equal or greater than `legendary`", async () => {
      await expect(
        itemFactory.connect(admin).setRarityRolls(60, 80, 90, 98, 97, 110)
      ).to.revertedWith("Epic must be less rare than legendary")
    })

    it("should revert if `legendary` is equal or greater than `maxRoll`", async () => {
      await expect(
        itemFactory.connect(admin).setRarityRolls(60, 80, 90, 98, 102, 100)
      ).to.revertedWith(
        "Legendary rarity level must be less than or equal to the max rarity roll"
      )
    })

    it("should update the rarity levels correctly", async () => {
      await itemFactory.connect(admin).setRarityRolls(60, 80, 85, 90, 99, 100)
      const common = await itemFactory._commonRoll()
      const uncommon = await itemFactory._uncommonRoll()
      const rare = await itemFactory._rareRoll()
      const epic = await itemFactory._epicRoll()
      const legendary = await itemFactory._legendaryRoll()

      expect([common, uncommon, rare, epic, legendary]).to.deep.equal([
        60, 80, 85, 90, 99,
      ])
    })
  })

  describe("setReward()", () => {
    it("should only allow ADMIN role", async () => {
      const rewardData = makeRewardCallData(1, 100, [1, 2])
      await expect(
        itemFactory.setReward(RewardType.MILK, RewardRarity.EPIC, rewardData)
      ).to.revertedWith("AccessControl: account")
    })

    it("should revert if `min` value is greater than `max` value", async () => {
      const rewardData = makeRewardCallData(100, 1, [1, 2])
      await expect(
        itemFactory
          .connect(admin)
          .setReward(RewardType.MILK, RewardRarity.EPIC, rewardData)
      ).to.revertedWith("ItemFactory: min can not be greater than max")
    })

    it("should revert if `ids` array length is zero", async () => {
      const rewardData = makeRewardCallData(1, 100, [])
      await expect(
        itemFactory
          .connect(admin)
          .setReward(RewardType.MILK, RewardRarity.EPIC, rewardData)
      ).to.revertedWith("ItemFactory: empty reward")
    })

    it("should set reward values correctly", async () => {
      const rewardData = makeRewardCallData(1, 100, [1, 2])
      await itemFactory
        .connect(admin)
        .setReward(RewardType.MILK, RewardRarity.EPIC, rewardData)

      const chainRewardData = await itemFactory._rewardMapping(
        RewardType.MILK,
        RewardRarity.EPIC
      )
      expect(chainRewardData).to.equal(rewardData)
    })
  })

  describe("supportsInterface()", () => {
    it("should support ERC165 and ERC1155", async () => {
      const isERC165Supported = await itemFactory.supportsInterface(
        INTERFACE_ID_MAP.ERC165
      )
      expect(isERC165Supported).be.equal(true)

      const isERC1155Supported = await itemFactory.supportsInterface(
        INTERFACE_ID_MAP.ERC1155
      )
      expect(isERC1155Supported).be.equal(true)
    })

    it("should not support random signatures", async () => {
      const randomSignature = "0x01fdcaa7"
      const isSignatureSupported = await itemFactory.supportsInterface(
        randomSignature
      )
      expect(isSignatureSupported).to.equal(false)
    })
  })

  describe("claim()", () => {
    beforeEach(async () => {
      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.ITEMS,
          RewardRarity.COMMON,
          makeRewardCallData(1, 100, [1, 2])
        )
      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.ITEMS,
          RewardRarity.UNCOMMON,
          makeRewardCallData(1, 100, [1, 2])
        )
      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.ITEMS,
          RewardRarity.RARE,
          makeRewardCallData(1, 100, [1, 2])
        )
      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.ITEMS,
          RewardRarity.EPIC,
          makeRewardCallData(1, 100, [1, 2])
        )
      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.ITEMS,
          RewardRarity.LEGENDARY,
          makeRewardCallData(1, 100, [1, 2])
        )

      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.MILK,
          RewardRarity.COMMON,
          makeRewardCallData(1, 100, [1, 2])
        )
      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.MILK,
          RewardRarity.UNCOMMON,
          makeRewardCallData(1, 100, [1, 2])
        )
      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.MILK,
          RewardRarity.RARE,
          makeRewardCallData(1, 100, [1, 2])
        )
      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.MILK,
          RewardRarity.EPIC,
          makeRewardCallData(1, 100, [1, 2])
        )
      await itemFactory
        .connect(admin)
        .setReward(
          RewardType.MILK,
          RewardRarity.LEGENDARY,
          makeRewardCallData(1, 100, [1, 2])
        )
    })

    it("should allow claim once a day per pet token", async () => {
      await expect(itemFactory.claim(user.address, 1, 12)).to.emit(
        itemFactory,
        "LogDailyClaim"
      )
      await expect(itemFactory.claim(user.address, 1, 11)).to.revertedWith(
        "ItemFactory: last claimed before 24 hours"
      )
      await ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
      await ethers.provider.send("evm_mine", [])
      await expect(itemFactory.claim(user.address, 1, 12)).to.emit(
        itemFactory,
        "LogDailyClaim"
      )
    })
  })
})
