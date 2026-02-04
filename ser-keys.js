import crypto from "crypto";

export function generateUserKeyPair() {
 return crypto.generateKeyPairSync("rsa", {
 modulusLength: 2048,
 publicKeyEncoding: { type: "pkcs1", format: "pem" },
 privateKeyEncoding: { type: "pkcs1", format: "pem" }
 });
}

export function encryptForUser(data, publicKey) {
 return crypto.publicEncrypt(publicKey, Buffer.from(data));
}

export function decryptForUser(data, privateKey) {
 return crypto.privateDecrypt(privateKey, data);
}