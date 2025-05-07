"use strict";
const blindSignatures = require('blind-signatures');
const { Coin, COIN_RIS_LENGTH, IDENT_STR, BANK_STR } = require('./coin.js');
const utils = require('./utils.js');

const BANK_KEY = blindSignatures.keyGeneration({ b: 2048 });
const N = BANK_KEY.keyPair.n.toString();
const E = BANK_KEY.keyPair.e.toString();

const BigInteger = require('jsbn').BigInteger; // Add this at the top

function signCoin(blindedCoinHash) {
  return blindSignatures.sign({
    blinded: new BigInteger(blindedCoinHash, 10), // Convert string to BigInteger
    key: BANK_KEY,
  });
}


function parseCoin(s) {
  let [cnst, amt, guid, leftHashes, rightHashes] = s.split('-');
  if (cnst !== BANK_STR) {
    throw new Error(`Invalid identity string: ${cnst} received, but ${BANK_STR} expected`);
  }
  let lh = leftHashes.split(',');
  let rh = rightHashes.split(',');
  return [lh, rh];
}

function acceptCoin(coin) {
  if (!blindSignatures.verify({
      unblinded: coin.signature,
      N: BANK_KEY.keyPair.n,
      E: BANK_KEY.keyPair.e,
      message: coin.toString()
    })) {
    throw new Error("Invalid coin signature.");
  }

  let isLeft = Math.random() < 0.5;
  let ris = [];
  for (let i = 0; i < COIN_RIS_LENGTH; i++) {
    ris.push(coin.getRis(isLeft, i));
  }

  return ris;
}

function determineCheater(guid, ris1, ris2) {
  let cheaterIdentified = false;
  for (let i = 0; i < ris1.length; i++) {
    let xorValue = utils.xorStrings(ris1[i], ris2[i]);
    if (xorValue.toString().startsWith(IDENT_STR)) {
      console.log(`Double-spender identified: ${xorValue.toString().substring(IDENT_STR.length)}`);
      cheaterIdentified = true;
      break;
    }
  }
  if (!cheaterIdentified) {
    console.log("The merchant attempted fraud.");
  }
}

let coin = new Coin('alice', 20, N, E);
coin.signature = signCoin(coin.blinded);
coin.unblind();

let ris1 = acceptCoin(coin);
let ris2 = acceptCoin(coin);

determineCheater(coin.guid, ris1, ris2);
console.log();
determineCheater(coin.guid, ris1, ris1);
