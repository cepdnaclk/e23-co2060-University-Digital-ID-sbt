// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

/// @custom:security-contact e23054@eng.pdn.ac.lk
contract PeraSoul is ERC721, ERC721Burnable, Ownable {
    uint256 private nextTokenId;

    mapping(address=>bool) public hasToken;
    mapping(address=>uint256) public studentToken;

    event TokenIssued(address indexed _student, uint256 indexed tokenId);
    event TokenBurned(address indexed _student, uint256 indexed tokenId);

    modifier validStudent(address _student) {
        require(_student!=address(0),"Invalid Student Address"); 
        _;
    }

    constructor()
        ERC721("PeraSoul", "PERA")
        Ownable(msg.sender)
    {
        nextTokenId=1;
    }

    function mint(address _student) external onlyOwner validStudent (_student) returns (uint256) {
        require(hasToken[_student]==false,"Student Already Has SBT");

        uint256 tokenId = nextTokenId;
        nextTokenId++;
        hasToken[_student]=true;
        studentToken[_student]=tokenId;

        _safeMint(_student, tokenId);
        emit TokenIssued(_student,tokenId);
        return tokenId;

    }

    function burn(address _student) external onlyOwner validStudent(_student) {
        require(hasToken[_student]==true,"Token Not Found");

        uint256 tokenId=studentToken[_student];
        hasToken[_student]=false;
        delete studentToken[_student];
        _burn(tokenId);
        emit TokenBurned(_student,tokenId);
    }

    function _update(address to, uint256 tokenId,address auth) internal override returns(address) {
        address from=_ownerOf(tokenId);
        if (from!=address(0) && to!=address(0)) {
            revert("SoulBound: transfer is denied");
        }
        return super._update(to, tokenId, auth);
    }
}