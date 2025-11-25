// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SecureFileRegistry {
    struct FileRecord {
        uint256 userId;
        string cid;
        string filename;
        uint256 timestamp;
    }

    mapping(uint256 => FileRecord[]) public userFiles; // userId => uploaded files
    event FileRegistered(uint256 indexed userId, string cid, string filename, uint256 timestamp);

    function registerFile(uint256 userId, string memory cid, string memory filename) public {
        FileRecord memory record = FileRecord({
            userId: userId,
            cid: cid,
            filename: filename,
            timestamp: block.timestamp
        });

        userFiles[userId].push(record);
        emit FileRegistered(userId, cid, filename, block.timestamp);
    }

    function getUserFiles(uint256 userId) external view returns (FileRecord[] memory) {
        return userFiles[userId];
    }

    function getFile(uint256 userId, uint256 index) external view returns (FileRecord memory) {
        require(index < userFiles[userId].length, "Invalid index");
        return userFiles[userId][index];
    }

    function getTotalFiles(uint256 userId) external view returns (uint256) {
        return userFiles[userId].length;
    }
}
