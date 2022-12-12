# Vale Multisig UI

[![Build Status](https://drone.rpanic.com/api/badges/rpanic/vale-ui/status.svg)](https://drone.rpanic.com/rpanic/vale-ui)

## Features

- Dynamic selection of signers, and the threshold for proposal approval
- Sending signatures and deposits with Aurowallet
- Creation of proposals and subsequent signing of approval / disapproval
- Automatic and instant payout of approved proposals
- Device-independent recreation of proposals and signer state using contract-events
- Live feed of pending transactions
- Decoding of transaction-purpose from events

## Core concepts

### Proposal

A proposal is an initiative of one of the signers of a wallet to send a specific amount of funds to an address.
This proposal can then be approved or declined by all of the signers 

## Limitations

AuroWallet is only used for sending transactions, not for deploying the contract and signing

Account creation fee cannot be paid by the contract at the moment due to a bug in snarkyjs 

Altought everything is in web-workers, everything works using signatures as of now

Off-chain storage hasn´t been implemented yet

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
