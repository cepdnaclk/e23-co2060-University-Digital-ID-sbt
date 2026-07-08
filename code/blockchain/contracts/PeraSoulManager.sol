// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IPeraSoul {
    function mint(address student) external returns (uint256);
    function burn(address student) external;
    function hasToken(address student) external view returns (bool);
    function studentToken(address student) external view returns (uint256);
}

contract PeraSoulManager is Ownable {
    IPeraSoul public peraSoul;

    mapping(uint256 => bool) public permanentlyRevoked;
    mapping(uint256 => uint256) public temporarilyRevokedUntil;

    event StudentTokenMinted(address indexed student, uint256 indexed tokenId);
    event TokenTemporarilyRevoked(uint256 indexed tokenId, uint256 untilTime);
    event TokenPermanentlyRevoked(uint256 indexed tokenId);
    event StudentWalletReplaced(address indexed oldWallet,address indexed newWallet,uint256 oldTokenId,uint256 newTokenId);

    constructor(address peraSoulAddress) Ownable(msg.sender) {
        require(peraSoulAddress != address(0), "Invalid PeraSoul address");
        peraSoul = IPeraSoul(peraSoulAddress);
    }

    function mintStudentToken(address student) external onlyOwner returns (uint256) {
        uint256 tokenId = peraSoul.mint(student);

        emit StudentTokenMinted(student, tokenId);

        return tokenId;
    }

    function revokeTemporarily(address student, uint256 durationInSeconds) external onlyOwner {
        require(peraSoul.hasToken(student), "Student has no token");
        require(durationInSeconds > 0, "Invalid duration");

        uint256 tokenId = peraSoul.studentToken(student);

        temporarilyRevokedUntil[tokenId] = block.timestamp + durationInSeconds;

        emit TokenTemporarilyRevoked(tokenId, temporarilyRevokedUntil[tokenId]);
    }

    function revokePermanently(address student) external onlyOwner {
        require(peraSoul.hasToken(student), "Student has no token");

        uint256 tokenId = peraSoul.studentToken(student);

        permanentlyRevoked[tokenId] = true;
        delete temporarilyRevokedUntil[tokenId];

        peraSoul.burn(student);

        emit TokenPermanentlyRevoked(tokenId);
    }

    function verifyStudent(address student) external view returns (bool) {
        if (!peraSoul.hasToken(student)) {
            return false;
        }

        uint256 tokenId = peraSoul.studentToken(student);

        if (permanentlyRevoked[tokenId]) {
            return false;
        }

        if (block.timestamp < temporarilyRevokedUntil[tokenId]) {
            return false;
        }

        return true;
    }

    function getRemainingRevocationTime(address student) external view returns (uint256) {
        require(peraSoul.hasToken(student), "Student has no token");

        uint256 tokenId = peraSoul.studentToken(student);
        uint256 revokedUntil = temporarilyRevokedUntil[tokenId];

        if (block.timestamp >= revokedUntil) {
            return 0;
        }

        return revokedUntil - block.timestamp;
    }

    function replaceStudentWallet(address oldWallet, address newWallet)
    external
    onlyOwner
    returns (uint256)
{
    require(oldWallet != address(0), "Invalid old wallet");
    require(newWallet != address(0), "Invalid new wallet");
    require(oldWallet != newWallet, "Wallets must be different");

    require(peraSoul.hasToken(oldWallet), "Old wallet has no token");
    require(!peraSoul.hasToken(newWallet), "New wallet already has token");

    uint256 oldTokenId = peraSoul.studentToken(oldWallet);
    permanentlyRevoked[oldTokenId]=true;
    delete temporarilyRevokedUntil[oldTokenId];

    // Burn old token
    peraSoul.burn(oldWallet);

    // Mint new token
    uint256 newTokenId = peraSoul.mint(newWallet);

    emit StudentWalletReplaced(oldWallet, newWallet, oldTokenId, newTokenId);

    return newTokenId;
}
}