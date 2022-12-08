# multisig-ui2

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
