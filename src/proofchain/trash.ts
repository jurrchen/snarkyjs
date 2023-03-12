import {
  SelfProof,
  Field,
  Proof,
  Experimental,
  verify,
  isReady,
  provablePure,
  Struct,
  Circuit,
  MerkleWitness,
} from 'snarkyjs';

import { 
  DynamicArray
} from './dynamicArray.js' // we use JS?

await isReady;

class ProofchainStruct extends Struct({
  //
  rootCommit: Field,
  // users >> we actually do want dynamic users?
  // users >> generate secret keys

  // check signerKey when appending a message
  // we don't want to check all signerKeys ideally O(n)
  // We can calculate 
  // userCommits: Set<Field>, // need to be able to check my commit

  userCommits: MerkleWitness,

  messagesCommit: MerkleWitness
}) {}


class Messages extends Struct({

}) {
  // append

  // hash
}




// const SignerMembership = Experimental.ZkProgram({
//   publicInput: provablePure(ProofchainStruct)
// })


// What is a MerkleWitness?

// https://docs.minaprotocol.com/zkapps/advanced-snarkyjs/merkle-tree



// const SignerMembership << another ZkProgram to determine signer membership. This can get passed into proof


// const MessageAppend << ZkProgram to show a particular message was appended to message chain

// const StateChangeProof?



// The MerkleTree is external to the proof
// https://github.com/o1-labs/snarkyjs/blob/main/src/examples/zkapps/merkle_tree/merkle_zkapp.ts#L78

// https://github.com/Raunaque97/RepeatingLifeZK/blob/main/src/gameOfLife.ts



type CompositeInput = {
  a: Field,
  b: Field,
}

const CompositeInput = provablePure(
  { a: Field, b: Field },
  { customObjectKeys: ['a', 'b'] }
);

const Program1 = Experimental.ZkProgram({
  publicInput: CompositeInput,

  methods: {
    baseCase: {
      privateInputs: [],

      method(publicInput: CompositeInput) {
        publicInput.a.assertEquals(Field(0))
        publicInput.b.assertEquals(Field(0))
      },
    },
  },
});


const Program1Proof = Experimental.ZkProgram.Proof(Program1);

const Program2 = Experimental.ZkProgram({
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      method(publicInput: Field) {
        publicInput.assertEquals(Field(1))
      },
    },

    inductiveCase: {
      privateInputs: [Program1Proof],

      // and can we add a self proof???
      method(publicInput: Field, anotherProof: Proof<CompositeInput>) {
        // anotherProof.verify();
        // anotherProof.publicInput.a.add(1).assertEquals(publicInput);
        // anotherProof.publicInput.b.add(1).assertEquals(publicInput);
      },
    },
  },
});

console.time('compiling 1');
await Program1.compile();
console.timeEnd('compiling 1');

console.time('compiling 2');
const { verificationKey } = await Program2.compile();
console.timeEnd('compiling 2');
console.log('verification key', verificationKey.slice(0, 10) + '..');

console.time('proving base case...');
const proof = await Program1.baseCase({
  a: Field(0),
  b: Field(0)
});
console.timeEnd('proving base case...');

console.time('proving step 1...');
const proof2 = await Program2.inductiveCase(Field(1), proof);
console.timeEnd('proving step 1...');

console.log('verify...');
const ok = await verify(proof2, verificationKey);
console.log('ok?', ok);
