// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../common/ERC1155SupplyCC.sol";

contract MockERC1155SupplyCC is ERC1155SupplyCC {
    uint256 private tokenId;

    constructor() ERC1155("mock-uri") {}

    function mint(uint256 _amount) external {
        _mint(msg.sender, tokenId, _amount, "");
        tokenId++;
    }

    function burn(uint256 _id, uint256 _amount) external {
        _burn(msg.sender, _id, _amount);
    }
}
